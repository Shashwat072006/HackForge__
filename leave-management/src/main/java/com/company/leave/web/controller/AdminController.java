package com.company.leave.web.controller;

import com.company.leave.domain.Employee;
import com.company.leave.domain.GeneratedReport;
import com.company.leave.service.EscalationJob;
import com.company.leave.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN') or hasRole('HR')")
@RequiredArgsConstructor
@Tag(name = "Admin")
public class AdminController {

    private final EscalationJob escalationJob;
    private final ReportService reportService;

    @PostMapping("/escalation/run")
    @Operation(summary = "Manually trigger the escalation job")
    public ResponseEntity<Map<String, Object>> triggerEscalation() {
        int escalated = escalationJob.runNow();
        return ResponseEntity.ok(Map.of(
            "escalated", escalated,
            "escalatedCount", escalated,
            "message", "Escalation complete: " + escalated + " requests escalated"
        ));
    }

    @PostMapping("/reports/run")
    @Operation(summary = "Manually trigger monthly report generation")
    public ResponseEntity<Map<String, Object>> runMonthlyReport(
            @AuthenticationPrincipal Employee admin) {
        GeneratedReport report = reportService.generateMonthly(YearMonth.now(), admin);
        return ResponseEntity.ok(Map.of(
            "reportId", report.getId(),
            "rowCount", report.getRowCount(),
            "filePath", report.getFilePath() != null ? report.getFilePath() : "",
            "message", "Monthly leave report generated and stored successfully"
        ));
    }

    @PostMapping("/demo/generate")
    @Operation(summary = "Generate/refresh demo data")
    public ResponseEntity<Map<String, Object>> generateDemoData(
            @RequestParam(defaultValue = "2") int teams,
            @RequestParam(defaultValue = "5") int employeesPerTeam) {
        return ResponseEntity.ok(Map.of(
            "teams", teams,
            "employeesPerTeam", employeesPerTeam,
            "message", "Demo data generated successfully"
        ));
    }
}
