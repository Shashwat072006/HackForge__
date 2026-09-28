package com.company.leave.web.dto;

import com.company.leave.domain.LeaveBalance;
import com.company.leave.domain.LeaveTypeCode;

import java.math.BigDecimal;

public record BalanceDto(
        Long leaveTypeId,
        LeaveTypeCode code,
        String leaveType,
        String name,
        int year,
        BigDecimal entitled,
        BigDecimal carriedForward,
        BigDecimal total,
        BigDecimal used,
        BigDecimal pending,
        BigDecimal available
) {
    public static BalanceDto from(LeaveBalance b) {
        BigDecimal total = (b.getEntitled() != null ? b.getEntitled() : BigDecimal.ZERO)
                .add(b.getCarriedForward() != null ? b.getCarriedForward() : BigDecimal.ZERO);
        String codeStr = b.getLeaveType().getCode() != null ? b.getLeaveType().getCode().name() : "";
        return new BalanceDto(
                b.getLeaveType().getId(),
                b.getLeaveType().getCode(),
                codeStr,
                b.getLeaveType().getName(),
                b.getYear(),
                b.getEntitled(),
                b.getCarriedForward(),
                total,
                b.getUsed(),
                b.getPending(),
                b.getAvailable()
        );
    }
}
