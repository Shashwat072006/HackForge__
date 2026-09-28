package com.company.leave.web.controller;

import com.company.leave.domain.Employee;
import com.company.leave.domain.LeaveStatus;
import com.company.leave.service.LeaveService;
import com.company.leave.web.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/leaves")
@RequiredArgsConstructor
@Tag(name = "Leave Requests")
public class LeaveController {

    private final LeaveService leaveService;

    @PostMapping
    @Operation(summary = "Submit a leave request")
    public ResponseEntity<LeaveRequestDto> apply(
            @AuthenticationPrincipal Employee employee,
            @Valid @RequestBody ApplyLeaveRequest req) {
        var lr = leaveService.submit(employee,
                req.leaveTypeId(), req.leaveType(),
                req.startDate(), req.endDate(), req.reason());
        return ResponseEntity.created(URI.create("/api/leaves/" + lr.getId()))
                .body(LeaveRequestDto.from(lr));
    }

    /** GET /api/leaves  — alias for /api/leaves/my (backward compat) */
    @GetMapping
    @Operation(summary = "List my leave requests")
    public ResponseEntity<List<LeaveRequestDto>> myRequests(
            @AuthenticationPrincipal Employee employee,
            @RequestParam(required = false) String status) {
        return buildMyList(employee, status);
    }

    /** GET /api/leaves/my — frontend canonical path */
    @GetMapping("/my")
    @Operation(summary = "List my leave requests (canonical)")
    public ResponseEntity<List<LeaveRequestDto>> myRequestsMy(
            @AuthenticationPrincipal Employee employee,
            @RequestParam(required = false) String status) {
        return buildMyList(employee, status);
    }

    private ResponseEntity<List<LeaveRequestDto>> buildMyList(Employee employee, String status) {
        if (status != null && !status.isBlank()) {
            try {
                LeaveStatus s = LeaveStatus.valueOf(status.trim());
                return ResponseEntity.ok(leaveService.myRequests(employee, s));
            } catch (IllegalArgumentException ignored) {
                // fall through to all
            }
        }
        return ResponseEntity.ok(leaveService.myRequests(employee));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a leave request by id")
    public ResponseEntity<LeaveRequestDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(leaveService.getById(id));
    }

    /** GET /api/leaves/{id}/history — approval timeline */
    @GetMapping("/{id}/history")
    @Operation(summary = "Get approval history for a leave request")
    public ResponseEntity<List<HistoryEntryDto>> history(@PathVariable Long id) {
        return ResponseEntity.ok(leaveService.getHistory(id));
    }

    /** POST /api/leaves/{id}/cancel — frontend uses POST, not DELETE */
    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel a leave request (POST alias)")
    public ResponseEntity<LeaveRequestDto> cancelPost(
            @AuthenticationPrincipal Employee employee,
            @PathVariable Long id,
            @RequestBody(required = false) ActionRequest req) {
        String comment = req != null ? req.comment() : null;
        return ResponseEntity.ok(LeaveRequestDto.from(leaveService.cancel(employee, id, comment)));
    }

    /** DELETE /api/leaves/{id} — kept for backward compat */
    @DeleteMapping("/{id}")
    @Operation(summary = "Cancel a leave request (DELETE alias)")
    public ResponseEntity<LeaveRequestDto> cancel(
            @AuthenticationPrincipal Employee employee,
            @PathVariable Long id,
            @RequestBody(required = false) ActionRequest req) {
        String comment = req != null ? req.comment() : null;
        return ResponseEntity.ok(LeaveRequestDto.from(leaveService.cancel(employee, id, comment)));
    }
}
