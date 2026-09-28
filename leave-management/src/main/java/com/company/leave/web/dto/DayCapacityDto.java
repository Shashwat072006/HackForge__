package com.company.leave.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DayCapacityDto(
        LocalDate date,
        int absentCount,
        BigDecimal absentFte,
        BigDecimal availableFte,
        BigDecimal totalFte,
        BigDecimal percent,
        String level,
        List<String> employees,
        boolean isPeakPeriod
) {
    public DayCapacityDto(LocalDate date, int absentCount, BigDecimal absentFte,
                          BigDecimal availableFte, boolean isPeakPeriod) {
        this(date, absentCount, absentFte, availableFte, availableFte.add(absentFte),
                BigDecimal.ZERO, "LOW", List.of(), isPeakPeriod);
    }
}
