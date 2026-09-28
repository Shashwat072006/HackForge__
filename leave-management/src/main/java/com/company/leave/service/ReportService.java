package com.company.leave.service;

import com.company.leave.domain.*;
import com.company.leave.repository.GeneratedReportRepository;
import com.company.leave.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileOutputStream;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final LeaveRequestRepository leaveRequestRepo;
    private final GeneratedReportRepository reportRepo;

    @Value("${leave.reports.dir:./reports}")
    private String reportsDir;

    /**
     * Generates (or returns cached) monthly approved-leave report for the given month.
     * @param yearMonth  e.g. YearMonth.of(2024, 10)
     * @param requestedBy  null for scheduled job
     * @return path to the generated .xlsx file
     */
    @Transactional
    public GeneratedReport generateMonthly(YearMonth yearMonth, Employee requestedBy) {
        LocalDate from = yearMonth.atDay(1);
        LocalDate to   = yearMonth.atEndOfMonth();

        // Return cached if already generated
        return reportRepo.findByTypeAndPeriodFromAndPeriodTo(ReportType.MONTHLY_APPROVED, from, to)
                .orElseGet(() -> {
                    List<LeaveRequest> rows = leaveRequestRepo.findApprovedForReport(from, to, null);
                    String path = buildExcel(rows, yearMonth);
                    return reportRepo.save(GeneratedReport.builder()
                            .type(ReportType.MONTHLY_APPROVED)
                            .periodFrom(from).periodTo(to)
                            .filePath(path).rowCount(rows.size())
                            .generatedBy(requestedBy).build());
                });
    }

    @Transactional(readOnly = true)
    public List<GeneratedReport> listReports() {
        return reportRepo.findAllByOrderByGeneratedAtDesc();
    }

    // ── Scheduled monthly job ─────────────────────────────────────────────────

    @Scheduled(cron = "${leave.reports.cron:0 0 1 1 * *}")
    public void scheduledMonthlyReport() {
        YearMonth lastMonth = YearMonth.now().minusMonths(1);
        log.info("Generating scheduled monthly report for {}", lastMonth);
        generateMonthly(lastMonth, null);
    }

    // ── Excel builder ─────────────────────────────────────────────────────────

    private String buildExcel(List<LeaveRequest> rows, YearMonth yearMonth) {
        try {
            File dir = new File(reportsDir);
            if (!dir.exists()) dir.mkdirs();

            String fileName = "approved_leave_" + yearMonth.format(DateTimeFormatter.ofPattern("yyyy_MM")) + ".xlsx";
            File file = new File(dir, fileName);

            try (Workbook wb = new XSSFWorkbook()) {
                Sheet sheet = wb.createSheet("Approved Leave");

                // Header
                Row header = sheet.createRow(0);
                String[] cols = {"ID","Employee","Team","Leave Type","Start","End","Working Days","Status","Approved At"};
                CellStyle bold = wb.createCellStyle();
                Font font = wb.createFont();
                font.setBold(true);
                bold.setFont(font);
                for (int i = 0; i < cols.length; i++) {
                    Cell c = header.createCell(i);
                    c.setCellValue(cols[i]);
                    c.setCellStyle(bold);
                }

                // Data rows
                int rowNum = 1;
                for (LeaveRequest lr : rows) {
                    Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(lr.getId());
                    row.createCell(1).setCellValue(lr.getEmployee().getName());
                    row.createCell(2).setCellValue(lr.getEmployee().getTeam() != null
                            ? lr.getEmployee().getTeam().getName() : "");
                    row.createCell(3).setCellValue(lr.getLeaveType().getName());
                    row.createCell(4).setCellValue(lr.getStartDate().toString());
                    row.createCell(5).setCellValue(lr.getEndDate().toString());
                    row.createCell(6).setCellValue(lr.getWorkingDays().doubleValue());
                    row.createCell(7).setCellValue(lr.getStatus().name());
                    row.createCell(8).setCellValue(lr.getUpdatedAt().toString());
                }

                for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);

                try (FileOutputStream fos = new FileOutputStream(file)) {
                    wb.write(fos);
                }
            }
            return file.getAbsolutePath();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate report: " + e.getMessage(), e);
        }
    }
}
