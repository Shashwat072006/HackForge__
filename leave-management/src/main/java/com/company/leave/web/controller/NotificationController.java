package com.company.leave.web.controller;

import com.company.leave.domain.Employee;
import com.company.leave.service.NotificationService;
import com.company.leave.web.dto.NotificationDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Get my notifications")
    public ResponseEntity<List<NotificationDto>> myNotifications(
            @AuthenticationPrincipal Employee employee) {
        return ResponseEntity.ok(notificationService.getMyNotifications(employee));
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark a notification as read")
    public ResponseEntity<Void> markRead(
            @AuthenticationPrincipal Employee employee,
            @PathVariable Long id) {
        notificationService.markRead(employee, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/read-all")
    @Operation(summary = "Mark all notifications as read")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal Employee employee) {
        notificationService.markAllRead(employee);
        return ResponseEntity.noContent().build();
    }
}
