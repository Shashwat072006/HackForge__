package com.company.leave.web.controller;

import com.company.leave.service.EscalationJob;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN') or hasRole('HR')")
@RequiredArgsConstructor
@Tag(name = "Admin")
public class AdminController {

    private final EscalationJob escalationJob;

    @PostMapping("/escalation/run")
    @Operation(summary = "Manually trigger the escalation job")
    public ResponseEntity<Map<String, Object>> triggerEscalation() {
        int escalated = escalationJob.runNow();
        return ResponseEntity.ok(Map.of("escalated", escalated));
    }
}
