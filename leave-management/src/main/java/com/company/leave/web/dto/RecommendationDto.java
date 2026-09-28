package com.company.leave.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record RecommendationDto(
        Long leaveRequestId,
        String decision,
        String verdict,
        List<String> reasons,
        String reason,
        List<String> newlyAtRiskTasks,
        List<Map<String, String>> alternatives,
        BigDecimal feasibilityPercent,
        List<LocalDate> infeasibleDates,
        SimulationResultDto simulation
) {
    public RecommendationDto(Long leaveRequestId, String verdict, String reason,
                             BigDecimal feasibilityPercent, List<LocalDate> infeasibleDates,
                             SimulationResultDto simulation) {
        this(
                leaveRequestId,
                "APPROVE".equals(verdict) ? "APPROVE" : ("REJECT".equals(verdict) ? "RESCHEDULE_SUGGESTED" : "APPROVE_WITH_CONDITIONS"),
                verdict,
                reason != null ? List.of(reason) : List.of(),
                reason,
                List.of(),
                List.of(),
                feasibilityPercent,
                infeasibleDates,
                simulation
        );
    }
}
