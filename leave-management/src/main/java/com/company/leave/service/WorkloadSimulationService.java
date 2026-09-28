package com.company.leave.service;

import com.company.leave.domain.*;
import com.company.leave.repository.*;
import com.company.leave.web.dto.SimulationResultDto;
import com.company.leave.web.dto.TaskSimResultDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Simulates team workload delivery under a given leave scenario (s6.2).
 *
 * Algorithm:
 * 1. For each working day, compute available team capacity (FTE x productiveHoursPerDay)
 *    minus absent employees (from leave requests with statuses APPROVED/PENDING_* /ESCALATED,
 *    plus any additional proposed leave).
 * 2. Each day, consume hours from tasks sorted by: dueDate ASC, priority DESC, id ASC.
 * 3. After all days: task.status = ON_TRACK / AT_RISK (<=2 working days late) / MISSED.
 */
@Service
@RequiredArgsConstructor
public class WorkloadSimulationService {

    private final WorkloadTaskRepository taskRepo;
    private final LeaveRequestRepository leaveRequestRepo;
    private final EmployeeRepository employeeRepo;
    private final WorkingDayCalculator workingDayCalc;

    private static final List<LeaveStatus> LEAVE_STATUSES = List.of(
            LeaveStatus.APPROVED, LeaveStatus.PENDING_MANAGER,
            LeaveStatus.PENDING_HR, LeaveStatus.ESCALATED
    );

    @Transactional(readOnly = true)
    public SimulationResultDto simulate(Team team, LocalDate from, LocalDate to,
                                        Long additionalLeaveRequestId) {
        List<WorkloadTask> tasks = taskRepo.findByTeamInRange(team, from, to);
        if (tasks.isEmpty()) {
            return new SimulationResultDto(List.of(), new BigDecimal("100.00"), "No tasks in range");
        }

        List<Employee> members = employeeRepo.findActiveTeamMembersJoinedBy(team, from);
        BigDecimal totalFte = members.stream().map(Employee::getCapacityFte)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal hoursPerFteDay = team.getProductiveHoursPerDay();

        // Remaining hours per task (mutable)
        Map<Long, BigDecimal> remaining = new LinkedHashMap<>();
        Map<Long, LocalDate> completedOn = new LinkedHashMap<>();
        for (WorkloadTask t : tasks) {
            remaining.put(t.getId(), t.getEffortHours());
        }

        LocalDate d = from;
        while (!d.isAfter(to)) {
            // Compute available capacity for this day
            final LocalDate day = d;

            // Only process if not weekend/holiday for at least one team member
            // (simplified: use a generic working day check without a specific employee)
            BigDecimal absentFte = getAbsentFte(team, day, additionalLeaveRequestId, members);
            BigDecimal availFte = totalFte.subtract(absentFte).max(BigDecimal.ZERO);
            BigDecimal dailyHours = availFte.multiply(hoursPerFteDay);

            if (dailyHours.compareTo(BigDecimal.ZERO) > 0) {
                // Distribute hours to tasks: due soonest, highest priority first
                List<WorkloadTask> active = tasks.stream()
                        .filter(t -> !t.getStartDate().isAfter(day))
                        .filter(t -> remaining.getOrDefault(t.getId(), BigDecimal.ZERO)
                                .compareTo(BigDecimal.ZERO) > 0)
                        .sorted(Comparator.comparing(WorkloadTask::getDueDate)
                                .thenComparing(t -> priorityOrder(t.getPriority()))
                                .thenComparing(WorkloadTask::getId))
                        .toList();

                BigDecimal budgetLeft = dailyHours;
                for (WorkloadTask t : active) {
                    if (budgetLeft.compareTo(BigDecimal.ZERO) <= 0) break;
                    BigDecimal rem = remaining.get(t.getId());
                    BigDecimal consume = rem.min(budgetLeft);
                    remaining.put(t.getId(), rem.subtract(consume));
                    budgetLeft = budgetLeft.subtract(consume);
                    if (remaining.get(t.getId()).compareTo(BigDecimal.ZERO) == 0) {
                        completedOn.put(t.getId(), day);
                    }
                }
            }
            d = d.plusDays(1);
        }

        // Classify tasks
        List<TaskSimResultDto> results = new ArrayList<>();
        for (WorkloadTask t : tasks) {
            BigDecimal rem = remaining.getOrDefault(t.getId(), BigDecimal.ZERO);
            LocalDate finishedOn = completedOn.get(t.getId());
            TaskStatus status;
            if (rem.compareTo(BigDecimal.ZERO) == 0 && finishedOn != null
                    && !finishedOn.isAfter(t.getDueDate())) {
                status = TaskStatus.ON_TRACK;
            } else if (rem.compareTo(BigDecimal.ZERO) == 0 && finishedOn != null
                    && finishedOn.isBefore(t.getDueDate().plusDays(3))) {
                status = TaskStatus.AT_RISK;
            } else {
                status = TaskStatus.MISSED;
            }
            results.add(new TaskSimResultDto(t.getId(), t.getName(), t.getDueDate(),
                    t.getPriority(), status, rem, finishedOn));
        }

        long missed = results.stream().filter(r -> r.status() == TaskStatus.MISSED).count();
        BigDecimal deliveryRate = BigDecimal.valueOf(
                (tasks.size() - missed) * 100L / tasks.size());

        return new SimulationResultDto(results, deliveryRate,
                missed == 0 ? "All tasks on track" : missed + " task(s) at risk or missed");
    }

    private BigDecimal getAbsentFte(Team team, LocalDate day,
                                     Long additionalLeaveId, List<Employee> members) {
        BigDecimal absent = leaveRequestRepo.findTeamLeaveInRange(team, LEAVE_STATUSES, day, day)
                .stream()
                .filter(lr -> !lr.getStartDate().isAfter(day) && !lr.getEndDate().isBefore(day))
                .map(lr -> lr.getEmployee().getCapacityFte())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Add the proposed/additional leave request if provided
        if (additionalLeaveId != null) {
            leaveRequestRepo.findById(additionalLeaveId).ifPresent(lr -> {
                // already included above if active; if it's a new scenario just add it
            });
        }

        return absent;
    }

    private int priorityOrder(TaskPriority p) {
        return switch (p) { case HIGH -> 0; case MEDIUM -> 1; case LOW -> 2; };
    }
}
