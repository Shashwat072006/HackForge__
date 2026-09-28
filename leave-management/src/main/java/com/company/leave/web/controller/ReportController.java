package com.company.leave.web.controller;

import com.company.leave.domain.Employee;
import com.company.leave.domain.GeneratedReport;
import com.company.leave.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/hr/reports")
@PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "HR")
public class ReportController {

    private final ReportService reportService;

    @GetMapping
    @Operation(summary = "List all generated reports")
    public ResponseEntity<List<GeneratedReport>> list() {
        return ResponseEntity.ok(reportService.listReports());
    }

    @PostMapping("/monthly")
    @Operation(summary = "Generate (or retrieve cached) monthly approved-leave report")
    public ResponseEntity<GeneratedReport> generateMonthly(
            @AuthenticationPrincipal Employee employee,
            @RequestParam(defaultValue = "") String yearMonth) {

        YearMonth ym = yearMonth.isBlank()
                ? YearMonth.now().minusMonths(1)
                : YearMonth.parse(yearMonth);
        return ResponseEntity.ok(reportService.generateMonthly(ym, employee));
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "Download a generated report Excel file")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        List<GeneratedReport> all = reportService.listReports();
        GeneratedReport report = all.stream().filter(r -> r.getId().equals(id)).findFirst()
                .orElseThrow(() -> new com.company.leave.domain.exception.ResourceNotFoundException(
                        "Report", id));
        File file = new File(report.getFilePath());
        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + file.getName() + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(resource);
    }
}
