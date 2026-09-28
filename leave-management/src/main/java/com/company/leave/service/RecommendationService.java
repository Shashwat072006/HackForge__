package com.company.leave.service;

import com.company.leave.domain.*;
import com.company.leave.web.dto.RecommendationDto;
import com.company.leave.web.dto.SimulationResultDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Produces a recommendation for a leave request based on:
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

        // Decision logic
        String verdict;
        String reason;
        BigDecimal feasPct = feasibility.feasibilityPercent();

        long missedTasks = simulation != null
                ? simulation.tasks().stream()
                    .filter(t -> t.status() == com.company.leave.domain.TaskStatus.MISSED).count()
                : 0L;

        if (feasPct.compareTo(new BigDecimal("80")) >= 0 && missedTasks == 0) {
            verdict = "APPROVE";
            reason = "Feasibility " + feasPct + "% and no tasks missed";
        } else if (feasPct.compareTo(new BigDecimal("50")) < 0 || missedTasks > 2) {
            verdict = "REJECT";
            reason = "Feasibility " + feasPct + "% or " + missedTasks + " tasks missed";
        } else {
            verdict = "DISCUSS";
            reason = "Feasibility " + feasPct + "% with " + missedTasks + " tasks at risk";
        }

        return new RecommendationDto(
                lr.getId(), verdict, reason,
                feasibility.feasibilityPercent(),
                feasibility.infeasibleDates(),
                simulation
        );
    }
}
