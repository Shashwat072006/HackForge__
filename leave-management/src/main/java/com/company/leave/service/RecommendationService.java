package com.company.leave.service;

import com.company.leave.domain.*;
import com.company.leave.web.dto.RecommendationDto;
import com.company.leave.web.dto.SimulationResultDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Produces an explainable, deterministic recommendation for a leave request based on:
 * 1. Capacity feasibility (§6.1)
 * 2. Workload simulation impact (§6.2)
 */
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final CapacityService capacityService;
    private final WorkloadSimulationService simulationService;

    @Transactional(readOnly = true)
    public RecommendationDto recommend(Employee actor, LeaveRequest lr) {
        CapacityService.FeasibilityResult feasibility = capacityService
                .checkFeasibility(lr.getEmployee(), lr.getStartDate(), lr.getEndDate());

        Team team = lr.getEmployee().getTeam();
        SimulationResultDto simulation = null;
        if (team != null) {
            simulation = simulationService.simulate(
                    team, lr.getStartDate(), lr.getEndDate(), lr.getId());
        }

        BigDecimal feasPct = feasibility.feasibilityPercent();
        List<String> reasons = new ArrayList<>();
        List<String> newlyAtRiskTasks = new ArrayList<>();

        if (simulation != null && simulation.tasks() != null) {
            simulation.tasks().stream()
                    .filter(t -> t.status() == com.company.leave.domain.TaskStatus.MISSED)
                    .forEach(t -> newlyAtRiskTasks.add("Task '" + t.name() + "' will miss deadline on " + t.dueDate()));
            simulation.tasks().stream()
                    .filter(t -> t.status() == com.company.leave.domain.TaskStatus.AT_RISK)
                    .forEach(t -> newlyAtRiskTasks.add("Task '" + t.name() + "' is at risk (due " + t.dueDate() + ")"));
        }

        String decision;
        if (feasPct.compareTo(new BigDecimal("100.00")) == 0 && newlyAtRiskTasks.isEmpty()) {
            decision = "APPROVE";
            reasons.add("Team capacity remains 100% compliant during this period.");
            reasons.add("All scheduled project tasks remain on track without delay.");
        } else if (feasPct.compareTo(new BigDecimal("50.00")) < 0 || newlyAtRiskTasks.size() > 2) {
            decision = "RESCHEDULE_SUGGESTED";
            reasons.add("Team capacity drops to " + feasPct + "%, exceeding the safe concurrent absence threshold.");
            if (!newlyAtRiskTasks.isEmpty()) {
                reasons.add(newlyAtRiskTasks.size() + " critical task(s) would be delayed or missed.");
            }
        } else {
            decision = "APPROVE_WITH_CONDITIONS";
            reasons.add("Partially feasible (" + feasPct + "% team capacity). Advisory review suggested.");
            if (!newlyAtRiskTasks.isEmpty()) {
                reasons.add("Some tasks require re-assignment: " + newlyAtRiskTasks.size() + " task(s) affected.");
            }
        }

        // Suggestions for alternative dates if not fully clear
        List<Map<String, String>> alternatives = new ArrayList<>();
        if (!"APPROVE".equals(decision)) {
            LocalDate altStart = lr.getEndDate().plusDays(4);
            while (altStart.getDayOfWeek().getValue() >= 6) altStart = altStart.plusDays(1);
            long days = lr.getWorkingDays() != null ? lr.getWorkingDays().longValue() : 3L;
            LocalDate altEnd = altStart.plusDays(days + 1);
            while (altEnd.getDayOfWeek().getValue() >= 6) altEnd = altEnd.plusDays(1);
            alternatives.add(Map.of(
                    "startDate", altStart.toString(),
                    "endDate", altEnd.toString()
            ));
        }

        String primaryReason = String.join(". ", reasons);
        return new RecommendationDto(
                lr.getId(),
                decision,
                decision,
                reasons,
                primaryReason,
                newlyAtRiskTasks,
                alternatives,
                feasPct,
                feasibility.infeasibleDates(),
                simulation
        );
    }
}
