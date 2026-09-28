package com.company.leave.web.dto;

import com.company.leave.domain.EmployeeRole;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request body for HR "create employee" endpoint.
 * All fields mirror the frontend EmployeesPage create-form.
 */
public record CreateEmployeeRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        /** Plain-text password set by HR; hashed before persistence. Optional — defaults to Demo@123 if blank. */
        String password,
        /** Role to assign. Nullable — defaults to EMPLOYEE. */
        EmployeeRole role,
        /** Team the employee belongs to. Required. */
        @NotNull Long teamId,
        Long managerId,
        @NotNull LocalDate joinDate,
        @NotNull BigDecimal capacityFte,
        String jobRole
) {}
