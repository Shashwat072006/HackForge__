package com.company.leave.service;

import com.company.leave.domain.*;
import com.company.leave.repository.ApprovalHistoryRepository;
import com.company.leave.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Periodically checks for leave requests whose current-stage deadline has passed
 * and escalates them: PENDING_MANAGER → ESCALATED, PENDING_HR stays PENDING_HR
 * but escalationLevel is incremented and HR/ADMIN are notified.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EscalationJob {

    private final LeaveRequestRepository leaveRequestRepo;
    private final ApprovalHistoryRepository historyRepo;
    private final NotificationService notificationService;

    @Value("${leave.escalation.hr-timeout-minutes:4320}")
    private long hrTimeoutMinutes;

    @Scheduled(fixedRateString = "${leave.escalation.check-interval-ms:300000}")
    @Transactional
    public void run() {
        List<LeaveRequest> overdue = leaveRequestRepo.findOverdueRequests(
                List.of(LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_HR),
                LocalDateTime.now());

        for (LeaveRequest lr : overdue) {
            try {
                escalate(lr);
            } catch (Exception e) {
                log.warn("Failed to escalate leave request {}: {}", lr.getId(), e.getMessage());
            }
        }
    }

    /** Also callable manually by Admin */
    @Transactional
    public int runNow() {
        List<LeaveRequest> overdue = leaveRequestRepo.findOverdueRequests(
                List.of(LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_HR),
                LocalDateTime.now());
        overdue.forEach(this::escalate);
        return overdue.size();
    }

    private void escalate(LeaveRequest lr) {
        LeaveStatus from = lr.getStatus();

        if (from == LeaveStatus.PENDING_MANAGER) {
            lr.setStatus(LeaveStatus.ESCALATED);
            lr.setEscalationLevel(lr.getEscalationLevel() + 1);
            lr.setCurrentStageDeadline(LocalDateTime.now().plusMinutes(hrTimeoutMinutes));
            leaveRequestRepo.save(lr);

            historyRepo.save(ApprovalHistory.builder()
                    .leaveRequest(lr).actor(null)  // SYSTEM
                    .fromStatus(from).toStatus(LeaveStatus.ESCALATED)
                    .action(LeaveEvent.ESCALATE)
                    .comment("Auto-escalated: manager did not act within deadline").build());

            notificationService.notifyAllHr(
                    "Leave request #" + lr.getId() + " by " + lr.getEmployee().getName()
                    + " has been escalated (manager timeout)");
            notificationService.notify(lr.getEmployee(),
                    "Your leave request #" + lr.getId() + " has been escalated to HR");

        } else if (from == LeaveStatus.PENDING_HR) {
            // Escalation within HR: increment level, notify again
            lr.setEscalationLevel(lr.getEscalationLevel() + 1);
            lr.setCurrentStageDeadline(LocalDateTime.now().plusMinutes(hrTimeoutMinutes));
            leaveRequestRepo.save(lr);

            historyRepo.save(ApprovalHistory.builder()
                    .leaveRequest(lr).actor(null)
                    .fromStatus(from).toStatus(LeaveStatus.PENDING_HR)
                    .action(LeaveEvent.ESCALATE)
                    .comment("Re-escalated: HR did not act within deadline (level "
                             + lr.getEscalationLevel() + ")").build());

            notificationService.notifyAllHr(
                    "URGENT: Leave request #" + lr.getId() + " still pending HR action (escalation level "
                    + lr.getEscalationLevel() + ")");
        }

        log.info("Escalated leave request {} from {} (level {})", lr.getId(), from, lr.getEscalationLevel());
    }
}
