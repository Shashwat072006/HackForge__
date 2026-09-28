package com.company.leave.web.dto;

import com.company.leave.domain.TaskPriority;
import com.company.leave.domain.TaskStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TaskSimResultDto(
        Long taskId,
        String name,
        LocalDate dueDate,
        TaskPriority priority,
        TaskStatus status,
        BigDecimal remainingHours,
        LocalDate completedOn
) {}
