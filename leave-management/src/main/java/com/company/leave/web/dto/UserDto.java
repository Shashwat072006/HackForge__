package com.company.leave.web.dto;

import com.company.leave.domain.Employee;
import com.company.leave.domain.EmployeeRole;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Serialized user/employee representation sent to the frontend.
 * Matches the {@code User} and {@code Employee} TypeScript interfaces.
 */
public record UserDto(
        Long id,
        String name,
        String email,
        EmployeeRole role,
        Long teamId,
        String teamName,
        String managerName,
        LocalDate joinDate,
        BigDecimal capacityFte,
        String jobRole
) {
    public static UserDto from(Employee e) {
        return new UserDto(
                e.getId(),
                e.getName(),
                e.getEmail(),
                e.getRole(),
                e.getTeam() != null ? e.getTeam().getId() : null,
                e.getTeam() != null ? e.getTeam().getName() : null,
                e.getManager() != null ? e.getManager().getName() : null,
                e.getJoinDate(),
                e.getCapacityFte(),
                e.getJobRole()
        );
    }
}
