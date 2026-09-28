package com.company.leave.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record RecommendationDto(
        Long leaveRequestId,
        String verdict,
        String reason,
        BigDecimal feasibilityPercent,
        List<LocalDate> infeasibleDates,
        SimulationResultDto simulation
) {}
