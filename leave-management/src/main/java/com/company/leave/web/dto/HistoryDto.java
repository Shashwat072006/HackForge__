package com.company.leave.web.dto;

import com.company.leave.domain.ApprovalHistory;
import com.company.leave.domain.LeaveEvent;
import com.company.leave.domain.LeaveStatus;

import java.time.LocalDateTime;

public record HistoryDto(
        Long id,
        Long actorId,
        String actorName,
        LeaveStatus fromStatus,
        LeaveStatus toStatus,
        LeaveEvent action,
        String comment,
        LocalDateTime createdAt
) {
    public static HistoryDto from(ApprovalHistory h) {
        return new HistoryDto(
                h.getId(),
                h.getActor() != null ? h.getActor().getId() : null,
                h.getActor() != null ? h.getActor().getName() : "SYSTEM",
                h.getFromStatus(),
                h.getToStatus(),
                h.getAction(),
                h.getComment(),
                h.getCreatedAt()
        );
    }
}
