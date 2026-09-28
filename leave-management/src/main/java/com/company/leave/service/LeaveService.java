package com.company.leave.service;

import com.company.leave.domain.*;
import com.company.leave.domain.exception.*;
import com.company.leave.repository.*;
import com.company.leave.web.dto.LeaveRequestDto;
import com.company.leave.web.dto.HistoryEntryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private final LeaveRequestRepository leaveRequestRepo;
    private final LeaveTypeRepository leaveTypeRepo;
    private final ApprovalHistoryRepository historyRepo;
    private final BalanceService balanceService;
    private final WorkingDayCalculator workingDayCalc;
    private final LeaveStateMachine stateMachine;
    private final NotificationService notificationService;

    @Value("${leave.escalation.manager-timeout-minutes:2880}")
    private long managerTimeoutMinutes;

    @Value("${leave.escalation.hr-timeout-minutes:4320}")
    private long hrTimeoutMinutes;

    // ── Submit ────────────────────────────────────────────────────────────────

    @Transactional
    public LeaveRequest submit(Employee employee, Long leaveTypeId, String leaveTypeCode,
                               LocalDate start, LocalDate end, String reason) {
        if (end.isBefore(start)) {
            throw new InvalidStateTransitionException("End date must be on or after start date");
        }

        LeaveType leaveType;
        if (leaveTypeId != null) {
            leaveType = leaveTypeRepo.findById(leaveTypeId)
                    .orElseThrow(() -> new ResourceNotFoundException("LeaveType", leaveTypeId));
        } else if (leaveTypeCode != null && !leaveTypeCode.isBlank()) {
            LeaveTypeCode code;
            try {
                code = LeaveTypeCode.valueOf(leaveTypeCode.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new ResourceNotFoundException("LeaveType code not found: " + leaveTypeCode, 0L);
            }
            leaveType = leaveTypeRepo.findByCode(code)
                    .orElseThrow(() -> new ResourceNotFoundException("LeaveType code: " + leaveTypeCode, 0L));
        } else {
            throw new InvalidStateTransitionException("leaveTypeId or leaveType code is required");
        }

        // Overlap check against ACTIVE statuses
        List<LeaveRequest> overlapping = leaveRequestRepo.findOverlapping(
                employee, LeaveStateMachine.ACTIVE_STATUSES.stream().toList(), start, end, null);
        if (!overlapping.isEmpty()) {
            throw new OverlappingRequestException("You already have a leave request overlapping this period");
        }

        int workingDays = workingDayCalc.countWorkingDays(start, end, employee);
        if (workingDays == 0) {
            throw new InvalidStateTransitionException("The requested period contains no working days");
        }

        // Balance check for types that require a balance
        int year = start.getYear();
        if (leaveType.isRequiresBalance()) {
            BigDecimal available = balanceService.getAvailable(employee, leaveType, year);
            if (available.compareTo(new BigDecimal(workingDays)) < 0) {
                throw new InsufficientBalanceException(
                        "Insufficient balance: available=" + available + " requested=" + workingDays);
            }
        }

        // Decide initial status (skip manager stage if employee has no manager)
        LeaveStatus initialStatus = employee.getManager() != null
                ? LeaveStatus.PENDING_MANAGER : LeaveStatus.PENDING_HR;
        long timeoutMinutes = employee.getManager() != null ? managerTimeoutMinutes : hrTimeoutMinutes;

        LeaveRequest lr = leaveRequestRepo.save(LeaveRequest.builder()
                .employee(employee)
                .leaveType(leaveType)
                .startDate(start)
                .endDate(end)
                .workingDays(new BigDecimal(workingDays))
                .reason(reason)
                .status(initialStatus)
                .currentStageDeadline(LocalDateTime.now().plusMinutes(timeoutMinutes))
                .build());

        balanceService.addPending(employee, leaveType, year, new BigDecimal(workingDays));

        historyRepo.save(ApprovalHistory.builder()
                .leaveRequest(lr).actor(employee)
                .fromStatus(null).toStatus(initialStatus)
                .action(LeaveEvent.SUBMIT).build());

        // Notify manager
        if (employee.getManager() != null) {
            notificationService.notify(employee.getManager(),
                    employee.getName() + " submitted a leave request (" + start + " → " + end + ")");
        }

        return lr;
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    @Transactional
    public LeaveRequest cancel(Employee actor, Long requestId, String comment) {
        LeaveRequest lr = getRequest(requestId);
        boolean isOwner = lr.getEmployee().getId().equals(actor.getId());

        if (!isOwner) {
            throw new ForbiddenActionException("Only the request owner can cancel");
        }
        if (lr.getStatus() == LeaveStatus.APPROVED && !lr.getStartDate().isAfter(LocalDate.now())) {
            throw new ForbiddenActionException("Cannot cancel approved leave that has already started");
        }

        LeaveStatus from = lr.getStatus();
        LeaveStatus to = stateMachine.transition(lr, LeaveEvent.CANCEL);
        lr.setStatus(to);
        lr.setCurrentStageDeadline(null);
        leaveRequestRepo.save(lr);

        if (from == LeaveStatus.APPROVED) {
            balanceService.removeUsed(lr.getEmployee(), lr.getLeaveType(), lr.getStartDate().getYear(),
                    lr.getWorkingDays());
        } else {
            balanceService.removePending(lr.getEmployee(), lr.getLeaveType(), lr.getStartDate().getYear(),
                    lr.getWorkingDays());
        }

        recordHistory(lr, actor, from, to, LeaveEvent.CANCEL, comment);
        return lr;
    }

    // ── Manager Approve ───────────────────────────────────────────────────────

    @Transactional
    public LeaveRequest managerApprove(Employee manager, Long requestId, String comment) {
        LeaveRequest lr = getRequest(requestId);
        guardManagerAction(manager, lr);

        LeaveStatus from = lr.getStatus();
        LeaveStatus to = stateMachine.transition(lr, LeaveEvent.MANAGER_APPROVE);
        lr.setStatus(to);
        lr.setCurrentStageDeadline(LocalDateTime.now().plusMinutes(hrTimeoutMinutes));
        leaveRequestRepo.save(lr);

        recordHistory(lr, manager, from, to, LeaveEvent.MANAGER_APPROVE, comment);

        notificationService.notify(lr.getEmployee(), "Your leave request was approved by your manager");
        return lr;
    }

    // ── Manager Reject ────────────────────────────────────────────────────────

    @Transactional
    public LeaveRequest managerReject(Employee manager, Long requestId, String comment) {
        LeaveRequest lr = getRequest(requestId);
        guardManagerAction(manager, lr);

        LeaveStatus from = lr.getStatus();
        LeaveStatus to = stateMachine.transition(lr, LeaveEvent.MANAGER_REJECT);
        lr.setStatus(to);
        lr.setCurrentStageDeadline(null);
        leaveRequestRepo.save(lr);

        balanceService.removePending(lr.getEmployee(), lr.getLeaveType(),
                lr.getStartDate().getYear(), lr.getWorkingDays());

        recordHistory(lr, manager, from, to, LeaveEvent.MANAGER_REJECT, comment);
        notificationService.notify(lr.getEmployee(), "Your leave request was rejected by your manager");
        return lr;
    }

    // ── HR Approve ────────────────────────────────────────────────────────────

    @Transactional
    public LeaveRequest hrApprove(Employee hr, Long requestId, String comment) {
        LeaveRequest lr = getRequest(requestId);
        guardHrAction(hr, lr);

        LeaveStatus from = lr.getStatus();
        LeaveStatus to = stateMachine.transition(lr, LeaveEvent.HR_APPROVE);
        lr.setStatus(to);
        lr.setCurrentStageDeadline(null);
        leaveRequestRepo.save(lr);

        // pending → used
        balanceService.removePending(lr.getEmployee(), lr.getLeaveType(),
                lr.getStartDate().getYear(), lr.getWorkingDays());
        balanceService.approveDays(lr.getEmployee(), lr.getLeaveType(),
                lr.getStartDate().getYear(), lr.getWorkingDays());

        recordHistory(lr, hr, from, to, LeaveEvent.HR_APPROVE, comment);
        notificationService.notify(lr.getEmployee(), "Your leave request was approved by HR");
        return lr;
    }

    // ── HR Reject ─────────────────────────────────────────────────────────────

    @Transactional
    public LeaveRequest hrReject(Employee hr, Long requestId, String comment) {
        LeaveRequest lr = getRequest(requestId);
        guardHrAction(hr, lr);

        LeaveStatus from = lr.getStatus();
        LeaveStatus to = stateMachine.transition(lr, LeaveEvent.HR_REJECT);
        lr.setStatus(to);
        lr.setCurrentStageDeadline(null);
        leaveRequestRepo.save(lr);

        balanceService.removePending(lr.getEmployee(), lr.getLeaveType(),
                lr.getStartDate().getYear(), lr.getWorkingDays());

        recordHistory(lr, hr, from, to, LeaveEvent.HR_REJECT, comment);
        notificationService.notify(lr.getEmployee(), "Your leave request was rejected by HR");
        return lr;
    }

    // ── Query helpers ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public LeaveRequestDto getById(Long id) {
        LeaveRequest lr = getRequest(id);
        return LeaveRequestDto.from(lr, historyRepo.findByLeaveRequestOrderByCreatedAtAsc(lr));
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestDto> myRequests(Employee employee) {
        return leaveRequestRepo.findByEmployeeOrderByCreatedAtDesc(employee)
                .stream().map(LeaveRequestDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestDto> myRequests(Employee employee, LeaveStatus status) {
        return leaveRequestRepo.findByEmployeeAndStatusOrderByCreatedAtDesc(employee, status)
                .stream().map(LeaveRequestDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<HistoryEntryDto> getHistory(Long leaveId) {
        LeaveRequest lr = getRequest(leaveId);
        return historyRepo.findByLeaveRequestOrderByCreatedAtAsc(lr)
                .stream()
                .map(h -> new HistoryEntryDto(
                        h.getCreatedAt() != null ? h.getCreatedAt().toString() : null,
                        h.getActor() != null ? h.getActor().getName() : null,
                        h.getAction() != null ? h.getAction().name() : null,
                        h.getComment()
                )).toList();
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestDto> teamPendingForManager(Employee manager) {
        return leaveRequestRepo
                .findByManagerAndStatusIn(manager.getId(),
                        List.of(LeaveStatus.PENDING_MANAGER))
                .stream().map(LeaveRequestDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestDto> hrQueue() {
        return leaveRequestRepo
                .findByStatusInOrderByCreatedAtDesc(
                        List.of(LeaveStatus.PENDING_HR, LeaveStatus.ESCALATED))
                .stream().map(LeaveRequestDto::from).toList();
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    public LeaveRequest getRequest(Long id) {
        return leaveRequestRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", id));
    }

    private void guardManagerAction(Employee manager, LeaveRequest lr) {
        if (lr.getStatus() != LeaveStatus.PENDING_MANAGER) {
            throw new InvalidStateTransitionException("Request is not in PENDING_MANAGER status");
        }
        // Manager cannot approve their own request
        if (lr.getEmployee().getId().equals(manager.getId())) {
            throw new ForbiddenActionException("You cannot approve your own leave request");
        }
        // Manager must be the direct manager of the employee
        Employee empManager = lr.getEmployee().getManager();
        if (empManager == null || !empManager.getId().equals(manager.getId())) {
            throw new ForbiddenActionException("You are not the direct manager of this employee");
        }
    }

    private void guardHrAction(Employee hr, LeaveRequest lr) {
        if (lr.getStatus() != LeaveStatus.PENDING_HR && lr.getStatus() != LeaveStatus.ESCALATED) {
            throw new InvalidStateTransitionException("Request is not in HR review status");
        }
        // HR cannot approve their own request
        if (lr.getEmployee().getId().equals(hr.getId())) {
            throw new ForbiddenActionException("You cannot approve your own leave request");
        }
    }

    private void recordHistory(LeaveRequest lr, Employee actor, LeaveStatus from,
                               LeaveStatus to, LeaveEvent event, String comment) {
        historyRepo.save(ApprovalHistory.builder()
                .leaveRequest(lr).actor(actor)
                .fromStatus(from).toStatus(to)
                .action(event).comment(comment).build());
    }
}
