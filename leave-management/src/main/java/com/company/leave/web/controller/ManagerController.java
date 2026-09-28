package com.company.leave.web.controller;

import com.company.leave.domain.Employee;
import com.company.leave.service.LeaveService;
import com.company.leave.web.dto.ActionRequest;
import com.company.leave.web.dto.LeaveRequestDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/manager")
@PreAuthorize("hasRole('MANAGER') or hasRole('HR') or hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Manager")
public class ManagerController {

    private final LeaveService leaveService;

    @GetMapping("/approvals")
    @Operation(summary = "List leave requests pending my approval")
    public ResponseEntity<List<LeaveRequestDto>> pendingApprovals(
            @AuthenticationPrincipal Employee manager) {
        return ResponseEntity.ok(leaveService.teamPendingForManager(manager));
    }

    @PostMapping("/approvals/{id}/approve")
    @Operation(summary = "Approve a pending leave request")
    public ResponseEntity<LeaveRequestDto> approve(
            @AuthenticationPrincipal Employee manager,
            @PathVariable Long id,
            @RequestBody(required = false) ActionRequest req) {
        return ResponseEntity.ok(LeaveRequestDto.from(
                leaveService.managerApprove(manager, id, req != null ? req.comment() : null)));
    }

    @PostMapping("/approvals/{id}/reject")
    @Operation(summary = "Reject a pending leave request")
    public ResponseEntity<LeaveRequestDto> reject(
            @AuthenticationPrincipal Employee manager,
            @PathVariable Long id,
            @RequestBody(required = false) ActionRequest req) {
        return ResponseEntity.ok(LeaveRequestDto.from(
                leaveService.managerReject(manager, id, req != null ? req.comment() : null)));
    }
}
