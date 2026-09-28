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
@RequestMapping("/api/hr")
@RequiredArgsConstructor
@Tag(name = "HR")
public class HrApprovalController {

    private final LeaveService leaveService;

    @GetMapping("/approvals")
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "List requests in HR review queue")
    public ResponseEntity<List<LeaveRequestDto>> hrQueue() {
        return ResponseEntity.ok(leaveService.hrQueue());
    }

    @PostMapping("/approvals/{id}/approve")
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "HR approves a leave request")
    public ResponseEntity<LeaveRequestDto> approve(
            @AuthenticationPrincipal Employee hr,
            @PathVariable Long id,
            @RequestBody(required = false) ActionRequest req) {
        return ResponseEntity.ok(LeaveRequestDto.from(
                leaveService.hrApprove(hr, id, req != null ? req.comment() : null)));
    }

    @PostMapping("/approvals/{id}/reject")
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "HR rejects a leave request")
    public ResponseEntity<LeaveRequestDto> reject(
            @AuthenticationPrincipal Employee hr,
            @PathVariable Long id,
            @RequestBody(required = false) ActionRequest req) {
        return ResponseEntity.ok(LeaveRequestDto.from(
                leaveService.hrReject(hr, id, req != null ? req.comment() : null)));
    }
}
