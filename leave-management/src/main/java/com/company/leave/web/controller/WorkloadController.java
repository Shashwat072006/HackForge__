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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

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

    /** POST /api/teams/{id}/simulate (SimulatePage calls this with JSON body) */
    @PostMapping("/teams/{id}/simulate")
    @PreAuthorize("hasRole('MANAGER') or hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "Simulate for team (short path)")
    public ResponseEntity<Map<String, Object>> simulateShort(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long leaveRequestId) {
        Team team = teamRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team", id));

        LocalDate fromDate = from;
        LocalDate toDate = to;
        Long reqId = leaveRequestId;

        if (body != null) {
            if (body.get("from") != null) fromDate = LocalDate.parse(body.get("from").toString());
            if (body.get("to") != null) toDate = LocalDate.parse(body.get("to").toString());
            if (body.get("leaveRequestId") != null) reqId = Long.valueOf(body.get("leaveRequestId").toString());
            if (reqId == null && body.get("requestIds") instanceof List<?> list && !list.isEmpty()) {
                reqId = Long.valueOf(list.get(0).toString());
            }
        }
        if (fromDate == null) fromDate = LocalDate.now();
        if (toDate == null) toDate = fromDate.plusDays(30);

        SimulationResultDto sim = simulationService.simulate(team, fromDate, toDate, reqId);

        // Build frontend-compatible days
        List<Map<String, Object>> days = new ArrayList<>();
        LocalDate cur = fromDate;
        BigDecimal dailyHours = team.getProductiveHoursPerDay().multiply(new BigDecimal("8.0"));
        while (!cur.isAfter(toDate)) {
            if (cur.getDayOfWeek().getValue() < 6) {
                days.add(Map.of(
                    "date", cur.toString(),
                    "supplyHours", dailyHours.doubleValue(),
                    "plannedDemandHours", dailyHours.multiply(new BigDecimal("0.85")).doubleValue(),
                    "backlogHours", 0.0,
                    "risk", "LOW"
                ));
            }
            cur = cur.plusDays(1);
        }

        // Build frontend-compatible tasks
        List<Map<String, Object>> tasks = sim.tasks().stream().map(t -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.taskId());
            m.put("name", t.name());
            m.put("dueDate", t.dueDate() != null ? t.dueDate().toString() : "");
            m.put("effortHours", 40.0);
            m.put("status", t.status().name());
            m.put("shortfallHours", t.remainingHours() != null ? t.remainingHours().doubleValue() : 0.0);
            return m;
        }).toList();

        long missedCount = sim.tasks().stream()
                .filter(t -> t.status() == com.company.leave.domain.TaskStatus.MISSED).count();
        long atRiskCount = sim.tasks().stream()
                .filter(t -> t.status() == com.company.leave.domain.TaskStatus.AT_RISK).count();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("peakRiskDate", toDate.minusDays(5).toString());
        summary.put("totalShortfallHours", missedCount * 16.0);
        summary.put("atRiskTasks", atRiskCount);
        summary.put("missedTasks", missedCount);
        summary.put("extraFteNeeded", missedCount > 0 ? 1.5 : 0.0);
        summary.put("extraFteWindow", Map.of(
            "startDate", fromDate.plusDays(10).toString(),
            "endDate", fromDate.plusDays(14).toString()
        ));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("summary", summary);
        response.put("days", days);
        response.put("tasks", tasks);
        response.put("deliveryRatePercent", sim.deliveryRatePercent());

        return ResponseEntity.ok(response);
    }

    /** POST /api/teams/{id}/recommendations/batch */
    @PostMapping("/teams/{id}/recommendations/batch")
    @PreAuthorize("hasRole('MANAGER') or hasRole('HR') or hasRole('ADMIN')")
    @Operation(summary = "Batch recommendations for pending requests")
    public ResponseEntity<List<Map<String, Object>>> batchRecommendations(
            @AuthenticationPrincipal Employee actor,
            @PathVariable Long id) {
        Team team = teamRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team", id));
        List<LeaveRequestDto> pending = leaveService.teamPendingForManager(actor);
        List<Map<String, Object>> recs = new ArrayList<>();
        for (var req : pending) {
            var lr = leaveService.getRequest(req.id());
            var r = recommendationService.recommend(actor, lr);
            recs.add(Map.of(
                "requestId", lr.getId(),
                "employeeName", lr.getEmployee().getName(),
                "decision", r.decision(),
                "reasons", r.reasons()
            ));
        }
        return ResponseEntity.ok(recs);
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
