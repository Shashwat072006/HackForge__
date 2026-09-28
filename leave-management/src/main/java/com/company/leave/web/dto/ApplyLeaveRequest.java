package com.company.leave.web.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

/**
 * Frontend sends leaveType as a string code (e.g. "ANNUAL").
 * leaveTypeId (Long) kept for backward-compat with tests.
 */
public record ApplyLeaveRequest(
        Long leaveTypeId,          // numeric ID (optional — used by tests)
        String leaveType,          // string code e.g. "ANNUAL" (used by frontend)
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        String reason
) {
    public ApplyLeaveRequest(Long leaveTypeId, LocalDate startDate, LocalDate endDate, String reason) {
        this(leaveTypeId, null, startDate, endDate, reason);
    }

    public ApplyLeaveRequest(String leaveType, LocalDate startDate, LocalDate endDate, String reason) {
        this(null, leaveType, startDate, endDate, reason);
    }
}
