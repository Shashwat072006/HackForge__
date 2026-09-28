package com.company.leave.web.controller;

import com.company.leave.domain.*;
import com.company.leave.domain.exception.ResourceNotFoundException;
import com.company.leave.repository.*;
import com.company.leave.service.BalanceService;
import com.company.leave.web.dto.CreateEmployeeRequest;
import com.company.leave.web.dto.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hr")
@RequiredArgsConstructor
@Tag(name = "HR")
public class HrController {

    private final EmployeeRepository employeeRepo;
    private final TeamRepository teamRepo;
    private final HolidayRepository holidayRepo;
    private final PeakPeriodRepository peakPeriodRepo;
    private final BalanceService balanceService;
    private final PasswordEncoder passwordEncoder;

    // ── Employees ─────────────────────────────────────────────────────────────

    @GetMapping("/employees")
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "List all employees (HR/Admin/Manager)")
    public ResponseEntity<List<UserDto>> listEmployees() {
        return ResponseEntity.ok(
            employeeRepo.findAll().stream().map(UserDto::from).toList()
        );
    }

    @PostMapping("/employees")
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "Create a new employee (HR/Admin)")
    public ResponseEntity<UserDto> createEmployee(@Valid @RequestBody CreateEmployeeRequest req) {
        var team = teamRepo.findById(req.teamId())
                .orElseThrow(() -> new ResourceNotFoundException("Team", req.teamId()));
        Employee manager = null;
        if (req.managerId() != null) {
            manager = employeeRepo.findById(req.managerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Manager", req.managerId()));
        }
        Employee emp = employeeRepo.save(Employee.builder()
                .name(req.name()).email(req.email())
                .passwordHash(passwordEncoder.encode("Demo@123"))
                .role(EmployeeRole.EMPLOYEE)
                .team(team).manager(manager)
                .joinDate(req.joinDate())
                .capacityFte(req.capacityFte())
                .jobRole(req.jobRole())
                .active(true).build());

        balanceService.initBalancesForEmployee(emp, LocalDate.now().getYear());

        return ResponseEntity.created(URI.create("/api/employees/" + emp.getId()))
                .body(UserDto.from(emp));
    }

    // ── Holidays ──────────────────────────────────────────────────────────────

    @GetMapping("/holidays")
    @Operation(summary = "List all gazetted holidays")
    public ResponseEntity<List<Holiday>> listHolidays() {
        return ResponseEntity.ok(holidayRepo.findAll());
    }

    @PostMapping("/holidays")
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "Add a gazetted holiday")
    public ResponseEntity<Holiday> addHoliday(@RequestBody Map<String, String> body) {
        Holiday h = holidayRepo.save(Holiday.builder()
                .date(LocalDate.parse(body.get("date")))
                .name(body.get("name"))
                .build());
        return ResponseEntity.created(URI.create("/api/hr/holidays/" + h.getId())).body(h);
    }

    @DeleteMapping("/holidays/{id}")
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "Delete a gazetted holiday")
    public ResponseEntity<Void> deleteHoliday(@PathVariable Long id) {
        holidayRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── Peak Periods ──────────────────────────────────────────────────────────

    @GetMapping("/peak-periods")
    @Operation(summary = "List all peak periods")
    public ResponseEntity<List<Map<String, Object>>> listPeaks() {
        return ResponseEntity.ok(
            peakPeriodRepo.findAll().stream().map(p -> Map.<String, Object>of(
                "id", p.getId(),
                "startDate", p.getFromDate().toString(),
                "endDate", p.getToDate().toString(),
                "description", p.getName()
            )).toList()
        );
    }

    @PostMapping("/peak-periods")
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "Add a peak period")
    public ResponseEntity<Map<String, Object>> addPeak(@RequestBody Map<String, String> body) {
        PeakPeriod p = peakPeriodRepo.save(PeakPeriod.builder()
                .fromDate(LocalDate.parse(body.get("startDate")))
                .toDate(LocalDate.parse(body.get("endDate")))
                .name(body.get("description"))
                .build());
        Map<String, Object> resp = Map.of(
            "id", p.getId(),
            "startDate", p.getFromDate().toString(),
            "endDate", p.getToDate().toString(),
            "description", p.getName()
        );
        return ResponseEntity.created(URI.create("/api/hr/peak-periods/" + p.getId())).body(resp);
    }

    @DeleteMapping("/peak-periods/{id}")
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "Delete a peak period")
    public ResponseEntity<Void> deletePeak(@PathVariable Long id) {
        peakPeriodRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
