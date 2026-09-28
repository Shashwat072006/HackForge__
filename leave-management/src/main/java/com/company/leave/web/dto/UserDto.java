package com.company.leave.web.dto;

import com.company.leave.domain.Employee;
import com.company.leave.domain.EmployeeRole;

public record UserDto(Long id, String name, String email, EmployeeRole role, Long teamId) {

    public static UserDto from(Employee e) {
        return new UserDto(
                e.getId(), e.getName(), e.getEmail(), e.getRole(),
                e.getTeam() != null ? e.getTeam().getId() : null
        );
    }
}
