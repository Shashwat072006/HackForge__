package com.company.leave.web.dto;

import com.company.leave.domain.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record LeaveRequestDto(
        Long id,
        Long employeeId,
        String employeeName,
        Long leaveTypeId,
        String leaveTypeName,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal workingDays,
        String reason,
        LeaveStatus status,
        int escalationLevel,
        boolean conflictFlag,
        BigDecimal feasibilityPercent,
        String conflictSummary,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<HistoryDto> history
) {
    public static LeaveRequestDto from(LeaveRequest lr, List<ApprovalHistory> history) {
        return new LeaveRequestDto(
                lr.getId(),
                lr.getEmployee().getId(),
                lr.getEmployee().getName(),
                lr.getLeaveType().getId(),
                lr.getLeaveType().getName(),
                lr.getStartDate(),
                lr.getEndDate(),
                lr.getWorkingDays(),
                lr.getReason(),
                lr.getStatus(),
                lr.getEscalationLevel(),
                lr.isConflictFlag(),
                lr.getFeasibilityPercent(),
                lr.getConflictSummary(),
                lr.getCreatedAt(),
                lr.getUpdatedAt(),
                history.stream().map(HistoryDto::from).toList()
        );
    }

    public static LeaveRequestDto from(LeaveRequest lr) {
        return from(lr, List.of());
    }
}
