package com.company.leave.service;

import com.company.leave.domain.*;
import com.company.leave.domain.exception.UploadInvalidException;
import com.company.leave.repository.*;
import com.company.leave.web.dto.WorkloadTaskDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkloadUploadService {

    private final WorkloadUploadBatchRepository batchRepo;
    private final WorkloadTaskRepository taskRepo;
    private final TeamRepository teamRepo;

    private static final int MAX_ROWS = 500;

    @Transactional
    public WorkloadUploadBatch upload(MultipartFile file, Team team, Employee uploadedBy) {
        List<UploadInvalidException.RowError> errors = new ArrayList<>();
        List<WorkloadTask> tasks = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook wb = WorkbookFactory.create(is)) {

            Sheet sheet = wb.getSheetAt(0);
            int rowCount = 0;

            for (Row row : sheet) {
                if (row.getRowNum() == 0) continue; // header
                if (rowCount >= MAX_ROWS) {
                    errors.add(new UploadInvalidException.RowError(rowCount + 1,
                            "Row limit exceeded. Max " + MAX_ROWS + " rows."));
                    break;
                }

                try {
                    String name        = getCellStr(row, 0);
                    BigDecimal hours   = new BigDecimal(getCellStr(row, 1));
                    LocalDate start    = getCellDate(row, 2);
                    LocalDate due      = getCellDate(row, 3);
                    String priorityStr = getCellStr(row, 4).toUpperCase();
                    String reqRole     = getCellStr(row, 5);

                    List<String> rowErrors = new ArrayList<>();
                    if (name.isBlank())          rowErrors.add("name is required");
                    if (hours.compareTo(BigDecimal.ZERO) <= 0) rowErrors.add("effort_hours must be > 0");
                    if (due.isBefore(start))     rowErrors.add("due_date must be >= start_date");

                    TaskPriority priority;
                    try { priority = TaskPriority.valueOf(priorityStr); }
                    catch (IllegalArgumentException e) { priority = TaskPriority.MEDIUM; }

                    if (!rowErrors.isEmpty()) {
                        int rowNum2 = row.getRowNum() + 1;
                        rowErrors.forEach(msg -> errors.add(
                                new UploadInvalidException.RowError(rowNum2, msg)));
                        continue;
                    }

                    tasks.add(WorkloadTask.builder()
                            .team(team).name(name).effortHours(hours)
                            .startDate(start).dueDate(due).priority(priority)
                            .requiredRole(reqRole.isBlank() ? null : reqRole)
                            .build());
                    rowCount++;
                } catch (Exception e) {
                    int rowNum2 = row.getRowNum() + 1;
                    errors.add(new UploadInvalidException.RowError(rowNum2, e.getMessage()));
                }
            }
        } catch (Exception e) {
            throw new UploadInvalidException("Cannot parse file: " + e.getMessage(), null);
        }

        if (!errors.isEmpty()) {
            throw new UploadInvalidException("Validation errors in uploaded file", errors);
        }

        WorkloadUploadBatch batch = batchRepo.save(WorkloadUploadBatch.builder()
                .team(team).fileName(file.getOriginalFilename())
                .uploadedBy(uploadedBy).rowCount(tasks.size()).build());

        tasks.forEach(t -> { t.setBatch(batch); taskRepo.save(t); });

        log.info("Workload batch {} uploaded: {} tasks for team {}", batch.getId(), tasks.size(), team.getName());
        return batch;
    }

    @Transactional(readOnly = true)
    public List<WorkloadTaskDto> getTasksForTeam(Team team, LocalDate from, LocalDate to) {
        return taskRepo.findByTeamInRange(team, from, to)
                .stream().map(WorkloadTaskDto::from).toList();
    }

    private String getCellStr(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            default      -> "";
        };
    }

    private LocalDate getCellDate(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) throw new IllegalArgumentException("Missing date in column " + col);
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate();
        }
        return LocalDate.parse(cell.getStringCellValue().trim());
    }

    /** Build a minimal Excel template the manager can fill in and upload */
    public byte[] buildTemplate() {
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook wb =
                     new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Tasks");
            Row header = sheet.createRow(0);
            String[] cols = {"Task Name", "Effort Hours", "Start Date (YYYY-MM-DD)",
                    "Due Date (YYYY-MM-DD)", "Priority (LOW/MEDIUM/HIGH/CRITICAL)"};
            for (int i = 0; i < cols.length; i++) {
                header.createCell(i).setCellValue(cols[i]);
            }
            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("Example Task");
            sample.createCell(1).setCellValue(8);
            sample.createCell(2).setCellValue(LocalDate.now().toString());
            sample.createCell(3).setCellValue(LocalDate.now().plusDays(5).toString());
            sample.createCell(4).setCellValue("HIGH");
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to build template", e);
        }
    }
}
