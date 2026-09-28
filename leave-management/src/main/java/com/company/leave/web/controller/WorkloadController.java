package com.company.leave.web.controller;

import com.company.leave.domain.Employee;
import com.company.leave.domain.Team;
import com.company.leave.domain.WorkloadUploadBatch;
import com.company.leave.domain.exception.ResourceNotFoundException;
import com.company.leave.repository.TeamRepository;
import com.company.leave.repository.WorkloadUploadBatchRepository;
import com.company.leave.service.*;
import com.company.leave.web.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Workload")
public class WorkloadController {

    private final WorkloadUploadService uploadService;
    private final WorkloadSimulationService simulationService;
    private final RecommendationService recommendationService;
    private final LeaveService leaveService;
    private final TeamRepository teamRepo;
    private final WorkloadUploadBatchRepository batchRepo;

    // ── Team-scoped endpoints (original) ─────────────────────────────────────

    @PostMapping("/teams/{teamId}/workload/upload")
    @PreAuthorize("hasRole('MANAGER') or hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "Upload workload task sheet (Excel) for a team")
    public ResponseEntity<WorkloadUploadBatch> upload(
            @AuthenticationPrincipal Employee employee,
            @PathVariable Long teamId,
            @RequestParam("file") MultipartFile file) {
        Team team = teamRepo.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", teamId));
        return ResponseEntity.ok(uploadService.upload(file, team, employee));
    }

    @GetMapping("/teams/{teamId}/workload/tasks")
    @Operation(summary = "List workload tasks for a team in a date range")
    public ResponseEntity<List<WorkloadTaskDto>> tasks(
            @PathVariable Long teamId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Team team = teamRepo.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", teamId));
        return ResponseEntity.ok(uploadService.getTasksForTeam(team, from, to));
    }

    @PostMapping("/teams/{teamId}/workload/simulate")
    @PreAuthorize("hasRole('MANAGER') or hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "Simulate workload delivery for a date range")
    public ResponseEntity<SimulationResultDto> simulate(
            @PathVariable Long teamId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long leaveRequestId) {
        Team team = teamRepo.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", teamId));
        return ResponseEntity.ok(simulationService.simulate(team, from, to, leaveRequestId));
    }

    // ── Flat-path aliases (called by frontend) ────────────────────────────────

    /** GET /api/workload/template.xlsx */
    @GetMapping("/workload/template.xlsx")
    @Operation(summary = "Download workload upload template")
    public ResponseEntity<byte[]> template() {
        byte[] bytes = uploadService.buildTemplate();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"tasks-template.xlsx\"")
                .body(bytes);
    }

    /** POST /api/workload/upload?teamId=...  */
    @PostMapping("/workload/upload")
    @PreAuthorize("hasRole('MANAGER') or hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "Upload workload task sheet (flat path alias)")
    public ResponseEntity<Map<String, Object>> uploadFlat(
            @AuthenticationPrincipal Employee employee,
            @RequestParam Long teamId,
            @RequestParam("file") MultipartFile file) {
        Team team = teamRepo.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", teamId));
        WorkloadUploadBatch batch = uploadService.upload(file, team, employee);
        return ResponseEntity.ok(Map.of(
            "batchId", batch.getId(),
            "taskCount", batch.getRowCount(),
            "accepted", batch.getRowCount(),
            "message", "Successfully uploaded " + batch.getRowCount() + " tasks"
        ));
    }

    /** GET /api/workload/tasks?teamId=...&month=YYYY-MM */
    @GetMapping("/workload/tasks")
    @Operation(summary = "List workload tasks (flat path alias)")
    public ResponseEntity<List<WorkloadTaskDto>> tasksFlat(
            @RequestParam Long teamId,
            @RequestParam(required = false) String month) {
        Team team = teamRepo.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", teamId));
        YearMonth ym = month != null ? YearMonth.parse(month) : YearMonth.now();
        LocalDate from = ym.atDay(1);
        LocalDate to = ym.atEndOfMonth();
        return ResponseEntity.ok(uploadService.getTasksForTeam(team, from, to));
    }

    /** DELETE /api/workload/batches/{id} */
    @DeleteMapping("/workload/batches/{id}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "Delete a workload batch")
    public ResponseEntity<Map<String, Object>> deleteBatch(@PathVariable Long id) {
        batchRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Batch deleted"));
    }

    /** POST /api/teams/{id}/simulate (SimulatePage calls this without /workload/ in path) */
    @PostMapping("/teams/{id}/simulate")
    @PreAuthorize("hasRole('MANAGER') or hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "Simulate for team (short path)")
    public ResponseEntity<SimulationResultDto> simulateShort(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long leaveRequestId) {
        Team team = teamRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team", id));
        return ResponseEntity.ok(simulationService.simulate(team, from, to, leaveRequestId));
    }

    // ── Recommendation ────────────────────────────────────────────────────────

    @PostMapping("/leaves/{id}/recommendation")
    @PreAuthorize("hasRole('MANAGER') or hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "Get AI-assisted recommendation for a leave request")
    public ResponseEntity<RecommendationDto> recommend(
            @AuthenticationPrincipal Employee actor,
            @PathVariable Long id) {
        var lr = leaveService.getRequest(id);
        return ResponseEntity.ok(recommendationService.recommend(actor, lr));
    }
}
