package com.company.leave.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PreviewResponse(
        BigDecimal feasibilityPercent,
        List<LocalDate> infeasibleDates,
        LocalDate peakDate,
        int workingDays,
        BigDecimal available
) {}
