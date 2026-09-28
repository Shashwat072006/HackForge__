package com.company.leave.web.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * Frontend sends: { leaveType: "ANNUAL", startDate: "...", endDate: "..." }
 * leaveTypeId kept for test backward compat.
 */
public record PreviewRequest(
        Long leaveTypeId,
        String leaveType,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate
) {}
