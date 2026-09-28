package com.company.leave.web.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateEmployeeRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        @NotNull Long teamId,
        Long managerId,
        @NotNull LocalDate joinDate,
        @NotNull BigDecimal capacityFte,
        String jobRole
) {}
