package com.company.leave.web.controller;

import com.company.leave.domain.Employee;
import com.company.leave.domain.GeneratedReport;
import com.company.leave.domain.LeaveRequest;
import com.company.leave.domain.ReportType;
import com.company.leave.repository.GeneratedReportRepository;
import com.company.leave.repository.LeaveRequestRepository;
import com.company.leave.service.ReportService;
import com.company.leave.web.dto.ReportDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hr/reports")
@PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "HR")
public class ReportController {

    private final ReportService reportService;
    private final LeaveRequestRepository leaveRequestRepo;
    private final GeneratedReportRepository reportRepo;

    @GetMapping
    @Operation(summary = "List all generated reports")
    public ResponseEntity<List<ReportDto>> list() {
        return ResponseEntity.ok(reportService.listReports().stream().map(ReportDto::from).toList());
    }

    @PostMapping({"/generate", "/monthly"})
    @Operation(summary = "Generate a report for date range or monthly")
    public ResponseEntity<ReportDto> generate(
            @AuthenticationPrincipal Employee employee,
            @RequestBody(required = false) Map<String, String> body,
            @RequestParam(required = false) String yearMonth) {

        YearMonth ym = YearMonth.now();
        if (body != null && body.get("from") != null) {
            try {
                ym = YearMonth.from(LocalDate.parse(body.get("from")));
            } catch (Exception ignored) {}
        } else if (yearMonth != null && !yearMonth.isBlank()) {
            ym = YearMonth.parse(yearMonth);
        }
        return ResponseEntity.ok(ReportDto.from(reportService.generateMonthly(ym, employee)));
    }

    @GetMapping("/approved-leaves.xlsx")
    @Operation(summary = "On-demand download of approved leaves spreadsheet")
    public ResponseEntity<Resource> downloadApprovedLeaves(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long teamId) {

        List<LeaveRequest> rows = leaveRequestRepo.findApprovedForReport(from, to, teamId);

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Approved Leaves");

            Row header = sheet.createRow(0);
            String[] cols = {"Request ID", "Employee", "Team", "Leave Type", "Start Date", "End Date", "Working Days", "Reason", "Status", "Approved At"};
            CellStyle bold = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            bold.setFont(font);
            for (int i = 0; i < cols.length; i++) {
                Cell c = header.createCell(i);
                c.setCellValue(cols[i]);
                c.setCellStyle(bold);
            }

            int rowIdx = 1;
            for (LeaveRequest lr : rows) {
                Row r = sheet.createRow(rowIdx++);
                r.createCell(0).setCellValue(lr.getId());
                r.createCell(1).setCellValue(lr.getEmployee().getName());
                r.createCell(2).setCellValue(lr.getEmployee().getTeam() != null ? lr.getEmployee().getTeam().getName() : "");
                r.createCell(3).setCellValue(lr.getLeaveType().getName());
                r.createCell(4).setCellValue(lr.getStartDate().toString());
                r.createCell(5).setCellValue(lr.getEndDate().toString());
                r.createCell(6).setCellValue(lr.getWorkingDays().doubleValue());
                r.createCell(7).setCellValue(lr.getReason() != null ? lr.getReason() : "");
                r.createCell(8).setCellValue(lr.getStatus().name());
                r.createCell(9).setCellValue(lr.getUpdatedAt() != null ? lr.getUpdatedAt().toString() : "");
            }

            for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);
            wb.write(bos);

            ByteArrayResource resource = new ByteArrayResource(bos.toByteArray());
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"approved-leaves-" + from + "-to-" + to + ".xlsx\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(resource);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate excel report: " + e.getMessage(), e);
        }
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
