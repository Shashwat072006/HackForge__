package com.company.leave.service;

import com.company.leave.domain.*;
import com.company.leave.repository.*;
import com.company.leave.web.dto.DayCapacityDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * Implements the capacity feasibility check from §6.1.
 *
 * For each working day d in [start, end]:
 *   absentFte  = sum of capacityFte for teammates with APPROVED/PENDING_* leave covering d
 *   supplyFte  = totalFte - absentFte - requester.capacityFte
 *   peakMult   = max multiplier of peak periods covering d (1.0 if none)
 *   demandFte  = totalFte × (maxConcurrentLeavePercent/100) × peakMult → min-present threshold
 *               actually: demandFte = totalFte × (1 - maxConcurrentLeavePercent/100) × peakMult
 *   feasible   = supplyFte >= demandFte
 * feasibilityPercent = feasibleDays / workingDays × 100
 */
@Service
@RequiredArgsConstructor
public class CapacityService {

    private final LeaveRequestRepository leaveRequestRepo;
    private final PeakPeriodRepository peakPeriodRepo;
    private final EmployeeRepository employeeRepo;
    private final WorkingDayCalculator workingDayCalc;

    private static final List<LeaveStatus> CAPACITY_STATUSES = List.of(
            LeaveStatus.APPROVED, LeaveStatus.PENDING_MANAGER,
            LeaveStatus.PENDING_HR, LeaveStatus.ESCALATED
    );

    @Transactional(readOnly = true)
    public FeasibilityResult checkFeasibility(Employee requester, LocalDate start, LocalDate end) {
        Team team = requester.getTeam();
        if (team == null) {
            // No team → always feasible
            return new FeasibilityResult(new BigDecimal("100.00"), List.of(), null);
        }

        // Total team FTE (active, joined by start date)
        List<Employee> members = employeeRepo.findActiveTeamMembersJoinedBy(team, start);
        BigDecimal totalFte = members.stream()
                .map(Employee::getCapacityFte)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal minPresent = totalFte.multiply(
                BigDecimal.ONE.subtract(
                        team.getMaxConcurrentLeavePercent().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)
                ));

        List<LocalDate> infeasibleDates = new ArrayList<>();
        LocalDate peakDate = null;
        int totalWorkingDays = 0;
        int feasibleDays = 0;

        LocalDate d = start;
        while (!d.isAfter(end)) {
            if (!workingDayCalc.isWorkingDay(d, requester)) { d = d.plusDays(1); continue; }
            totalWorkingDays++;

            final LocalDate day = d;
            BigDecimal absentFte = leaveRequestRepo
                    .findTeamLeaveOnDate(team, CAPACITY_STATUSES, day, requester)
                    .stream()
                    .map(lr -> lr.getEmployee().getCapacityFte())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal supplyFte = totalFte.subtract(absentFte).subtract(requester.getCapacityFte());

            // Peak period multiplier
            List<PeakPeriod> peaks = peakPeriodRepo.findActiveOnDate(team, day);
            BigDecimal peakMult = peaks.stream()
                    .map(PeakPeriod::getMultiplier)
                    .max(Comparator.naturalOrder())
                    .orElse(BigDecimal.ONE);

            BigDecimal effectiveDemand = minPresent.multiply(peakMult).setScale(4, RoundingMode.HALF_UP);

            if (supplyFte.compareTo(effectiveDemand) >= 0) {
                feasibleDays++;
            } else {
                infeasibleDates.add(day);
                if (!peaks.isEmpty() && peakDate == null) peakDate = day;
            }

            d = d.plusDays(1);
        }

        BigDecimal percent = totalWorkingDays == 0 ? new BigDecimal("100.00") :
                BigDecimal.valueOf(feasibleDays * 100L)
                        .divide(BigDecimal.valueOf(totalWorkingDays), 2, RoundingMode.HALF_UP);

        return new FeasibilityResult(percent, infeasibleDates, peakDate);
    }

    @Transactional(readOnly = true)
    public List<DayCapacityDto> teamAvailability(Team team, LocalDate from, LocalDate to) {
        List<Employee> members = employeeRepo.findActiveTeamMembersJoinedBy(team, from);
        BigDecimal totalFte = members.stream().map(Employee::getCapacityFte)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<LeaveRequest> teamLeave = leaveRequestRepo.findTeamLeaveInRange(
                team, CAPACITY_STATUSES, from, to);

        BigDecimal maxConcurrentPct = team.getMaxConcurrentLeavePercent() != null
                ? team.getMaxConcurrentLeavePercent() : new BigDecimal("30");
        BigDecimal allowedAbsent = totalFte.multiply(maxConcurrentPct)
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        if (allowedAbsent.compareTo(BigDecimal.ONE) < 0) {
            allowedAbsent = BigDecimal.ONE;
        }

        List<DayCapacityDto> result = new ArrayList<>();
        LocalDate d = from;
        while (!d.isAfter(to)) {
            final LocalDate day = d;
            List<LeaveRequest> dayLeaves = teamLeave.stream()
                    .filter(lr -> !lr.getStartDate().isAfter(day) && !lr.getEndDate().isBefore(day))
                    .toList();

            long absentCount = dayLeaves.size();
            BigDecimal absentFte = dayLeaves.stream()
                    .map(lr -> lr.getEmployee().getCapacityFte())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            List<String> absentEmployees = dayLeaves.stream()
                    .map(lr -> lr.getEmployee().getName())
                    .distinct()
                    .toList();

            List<PeakPeriod> peaks = peakPeriodRepo.findActiveOnDate(team, day);
            boolean isPeak = !peaks.isEmpty();

            BigDecimal percent = totalFte.compareTo(BigDecimal.ZERO) > 0
                    ? absentFte.multiply(BigDecimal.valueOf(100)).divide(totalFte, 1, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            String level;
            if (absentFte.compareTo(allowedAbsent) >= 0) {
                level = "HIGH";
            } else if (absentFte.compareTo(allowedAbsent.multiply(new BigDecimal("0.5"))) >= 0) {
                level = "MEDIUM";
            } else {
                level = "LOW";
            }

            result.add(new DayCapacityDto(
                    day,
                    (int) absentCount,
                    absentFte,
                    totalFte.subtract(absentFte),
                    totalFte,
                    percent,
                    level,
                    absentEmployees,
                    isPeak
            ));
            d = d.plusDays(1);
        }
        return result;
    }

    public record FeasibilityResult(
            BigDecimal feasibilityPercent,
            List<LocalDate> infeasibleDates,
            LocalDate peakDate
    ) {}
}
