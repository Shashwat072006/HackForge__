package com.company.leave.web.dto;

import com.company.leave.domain.TaskPriority;
import com.company.leave.domain.WorkloadTask;

import java.math.BigDecimal;
import java.time.LocalDate;

public record WorkloadTaskDto(
        Long id,
        String name,
        BigDecimal effortHours,
        LocalDate startDate,
        LocalDate dueDate,
        TaskPriority priority,
        String requiredRole
) {
    public static WorkloadTaskDto from(WorkloadTask t) {
        return new WorkloadTaskDto(t.getId(), t.getName(), t.getEffortHours(),
                t.getStartDate(), t.getDueDate(), t.getPriority(), t.getRequiredRole());
    }
}
