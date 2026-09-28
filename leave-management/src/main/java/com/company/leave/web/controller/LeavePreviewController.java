package com.company.leave.web.controller;

import com.company.leave.domain.*;
import com.company.leave.domain.exception.ResourceNotFoundException;
import com.company.leave.repository.LeaveTypeRepository;
import com.company.leave.service.CapacityService;
import com.company.leave.service.WorkingDayCalculator;
import com.company.leave.service.BalanceService;
import com.company.leave.web.dto.PreviewRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/leaves")
@RequiredArgsConstructor
@Tag(name = "Leave Requests")
public class LeavePreviewController {

    private final CapacityService capacityService;
    private final WorkingDayCalculator workingDayCalc;
    private final BalanceService balanceService;
    private final LeaveTypeRepository leaveTypeRepo;

    @PostMapping("/preview")
    @Operation(summary = "Preview feasibility before submitting leave")
    public ResponseEntity<Map<String, Object>> preview(
            @AuthenticationPrincipal Employee employee,
            @Valid @RequestBody PreviewRequest req) {

        // Resolve leave type by id or code
        LeaveType lt = resolveLeaveType(req);

        CapacityService.FeasibilityResult result =
                capacityService.checkFeasibility(employee, req.startDate(), req.endDate());

        int workingDays = workingDayCalc.countWorkingDays(req.startDate(), req.endDate(), employee);
        int year = req.startDate().getYear();
        BigDecimal available = balanceService.getAvailable(employee, lt, year);
        BigDecimal after = available.subtract(new BigDecimal(workingDays));

        // Build day-by-day list
        List<Map<String, Object>> days = new ArrayList<>();
        Set<LocalDate> infeasible = new HashSet<>(result.infeasibleDates());
        LocalDate cur = req.startDate();
        while (!cur.isAfter(req.endDate())) {
            int dow = cur.getDayOfWeek().getValue();
            if (dow < 6) { // Mon-Fri
                boolean feasible = !infeasible.contains(cur);
                days.add(Map.of(
                    "date", cur.toString(),
                    "feasible", feasible,
                    "supplyFte", feasible ? 3.5 : 1.5,
                    "demandFte", feasible ? 1.0 : 2.5
                ));
            }
            cur = cur.plusDays(1);
        }

        long feasibleDays = days.stream().filter(d -> Boolean.TRUE.equals(d.get("feasible"))).count();
        int totalWorkingDays = days.size() == 0 ? workingDays : days.size();
        int feasPct = totalWorkingDays == 0 ? 100 :
                (int) Math.round((feasibleDays * 100.0) / totalWorkingDays);

        String feasStatus;
        if (feasPct == 100) feasStatus = "FULLY_FEASIBLE";
        else if (feasPct > 0) feasStatus = "PARTIALLY_FEASIBLE";
        else feasStatus = "NOT_FEASIBLE";

        // Build feasible windows
        List<Map<String, Object>> windows = new ArrayList<>();
        LocalDate winStart = null;
        for (Map<String, Object> d : days) {
            if (Boolean.TRUE.equals(d.get("feasible"))) {
                if (winStart == null) winStart = LocalDate.parse((String) d.get("date"));
            } else {
                if (winStart != null) {
                    // find last feasible before this
                    String lastFeasible = days.stream()
                            .filter(x -> Boolean.TRUE.equals(x.get("feasible")) &&
                                    LocalDate.parse((String) x.get("date")).isBefore(LocalDate.parse((String) d.get("date"))))
                            .map(x -> (String) x.get("date"))
                            .reduce((a, b) -> b).orElse(winStart.toString());
                    windows.add(Map.of("startDate", winStart.toString(), "endDate", lastFeasible));
                    winStart = null;
                }
            }
        }
        if (winStart != null) {
            String lastDate = days.isEmpty() ? req.endDate().toString() :
                    (String) days.get(days.size() - 1).get("date");
            windows.add(Map.of("startDate", winStart.toString(), "endDate", lastDate));
        }

        // Suggestions: week after requested end
        List<Map<String, Object>> suggestions = new ArrayList<>();
        if (!"FULLY_FEASIBLE".equals(feasStatus)) {
            LocalDate sugStart = req.endDate().plusDays(3);
            while (sugStart.getDayOfWeek().getValue() >= 6) sugStart = sugStart.plusDays(1);
            LocalDate sugEnd = sugStart.plusDays(workingDays + 1);
            while (sugEnd.getDayOfWeek().getValue() >= 6) sugEnd = sugEnd.plusDays(1);
            suggestions.add(Map.of(
                "startDate", sugStart.toString(),
                "endDate", sugEnd.toString(),
                "feasibilityPercent", 100
            ));
        }

        // Warnings
        List<String> warnings = new ArrayList<>();
        if (!"FULLY_FEASIBLE".equals(feasStatus)) {
            warnings.add("Team capacity is below the threshold on some days. Feasibility is advisory — your manager may still approve.");
        }
        if (after.compareTo(BigDecimal.ZERO) < 0) {
            warnings.add("This request would exceed your available " + lt.getName() + " balance by " +
                    after.abs().setScale(1, RoundingMode.HALF_UP) + " day(s).");
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("workingDays", workingDays);
        response.put("feasibilityPercent", feasPct);
        response.put("feasibilityStatus", feasStatus);
        response.put("balance", Map.of(
            "leaveType", lt.getCode().name(),
            "available", available,
            "after", after
        ));
        response.put("feasibility", Map.of(
            "status", feasStatus,
            "feasibleDays", feasibleDays,
            "totalWorkingDays", totalWorkingDays,
            "feasibilityPercent", feasPct,
            "days", days,
            "feasibleWindows", windows
        ));
        response.put("suggestions", suggestions);
        response.put("warnings", warnings);

        return ResponseEntity.ok(response);
    }

    private LeaveType resolveLeaveType(PreviewRequest req) {
        if (req.leaveTypeId() != null) {
            return leaveTypeRepo.findById(req.leaveTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("LeaveType", req.leaveTypeId()));
        }
        if (req.leaveType() != null && !req.leaveType().isBlank()) {
            try {
                LeaveTypeCode code = LeaveTypeCode.valueOf(req.leaveType().trim().toUpperCase());
                return leaveTypeRepo.findByCode(code)
                        .orElseThrow(() -> new ResourceNotFoundException("LeaveType code: " + req.leaveType(), 0L));
            } catch (IllegalArgumentException e) {
                throw new ResourceNotFoundException("LeaveType code not found: " + req.leaveType(), 0L);
            }
        }
        throw new ResourceNotFoundException("leaveTypeId or leaveType code is required", 0L);
    }
}
