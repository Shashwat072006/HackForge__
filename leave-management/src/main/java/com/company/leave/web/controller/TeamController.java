package com.company.leave.web.controller;

import com.company.leave.domain.Team;
import com.company.leave.domain.exception.ResourceNotFoundException;
import com.company.leave.repository.TeamRepository;
import com.company.leave.service.CapacityService;
import com.company.leave.web.dto.DayCapacityDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@Tag(name = "Teams")
public class TeamController {

    private final TeamRepository teamRepo;
    private final CapacityService capacityService;

    @GetMapping("/{teamId}/availability")
    @Operation(summary = "Team availability heatmap for a date range")
    public ResponseEntity<List<DayCapacityDto>> availability(
            @PathVariable Long teamId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        Team team = teamRepo.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", teamId));

        return ResponseEntity.ok(capacityService.teamAvailability(team, from, to));
    }
}
