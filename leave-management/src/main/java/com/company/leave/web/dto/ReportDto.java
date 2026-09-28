package com.company.leave.web.dto;

import com.company.leave.domain.GeneratedReport;

import java.time.LocalDateTime;

/**
 * DTO for the Reports page.
 * Matches the TypeScript {@code Report} interface:
 * {@code { id, fromDate, toDate, generatedAt, rowCount, generatedBy }}
 */
public record ReportDto(
        Long id,
        String fromDate,
        String toDate,
        LocalDateTime generatedAt,
        int rowCount,
        String generatedBy
) {
    public static ReportDto from(GeneratedReport r) {
        return new ReportDto(
                r.getId(),
                r.getPeriodFrom() != null ? r.getPeriodFrom().toString() : null,
                r.getPeriodTo()   != null ? r.getPeriodTo().toString()   : null,
                r.getGeneratedAt(),
                r.getRowCount(),
                r.getGeneratedBy() != null ? r.getGeneratedBy().getName() : null
        );
    }
}
