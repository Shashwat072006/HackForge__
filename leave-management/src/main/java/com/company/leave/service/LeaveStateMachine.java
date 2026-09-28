package com.company.leave.service;

import com.company.leave.domain.*;
import com.company.leave.domain.exception.InvalidStateTransitionException;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Defines valid (fromStatus, event) -> toStatus transitions.
 * Guards (actor cannot approve own request, etc.) are enforced in LeaveService.
 */
@Component
public class LeaveStateMachine {

    private record TransitionKey(LeaveStatus from, LeaveEvent event) {}

    private static final Map<TransitionKey, LeaveStatus> TRANSITIONS = new HashMap<>();

    static {
        // Manager acts on PENDING_MANAGER
        put(LeaveStatus.PENDING_MANAGER, LeaveEvent.MANAGER_APPROVE, LeaveStatus.PENDING_HR);
        put(LeaveStatus.PENDING_MANAGER, LeaveEvent.MANAGER_REJECT,  LeaveStatus.REJECTED);
        put(LeaveStatus.PENDING_MANAGER, LeaveEvent.ESCALATE,        LeaveStatus.ESCALATED);
        put(LeaveStatus.PENDING_MANAGER, LeaveEvent.CANCEL,          LeaveStatus.CANCELLED);

        // HR acts on PENDING_HR
        put(LeaveStatus.PENDING_HR, LeaveEvent.HR_APPROVE, LeaveStatus.APPROVED);
        put(LeaveStatus.PENDING_HR, LeaveEvent.HR_REJECT,  LeaveStatus.REJECTED);
        put(LeaveStatus.PENDING_HR, LeaveEvent.CANCEL,     LeaveStatus.CANCELLED);
        put(LeaveStatus.PENDING_HR, LeaveEvent.ESCALATE,   LeaveStatus.PENDING_HR);

        // HR acts on ESCALATED
        put(LeaveStatus.ESCALATED, LeaveEvent.HR_APPROVE, LeaveStatus.APPROVED);
        put(LeaveStatus.ESCALATED, LeaveEvent.HR_REJECT,  LeaveStatus.REJECTED);
        put(LeaveStatus.ESCALATED, LeaveEvent.CANCEL,     LeaveStatus.CANCELLED);

        // Cancelling an APPROVED request
        put(LeaveStatus.APPROVED, LeaveEvent.CANCEL, LeaveStatus.CANCELLED);
    }

    private static void put(LeaveStatus from, LeaveEvent event, LeaveStatus to) {
        TRANSITIONS.put(new TransitionKey(from, event), to);
    }

    /** Resolves and returns the new status, or throws InvalidStateTransitionException. */
    public LeaveStatus transition(LeaveRequest request, LeaveEvent event) {
        LeaveStatus from = request.getStatus();
        LeaveStatus to = TRANSITIONS.get(new TransitionKey(from, event));
        if (to == null) {
            throw new InvalidStateTransitionException(
                    "Cannot apply " + event + " to a request in status " + from);
        }
        return to;
    }

    public static final Set<LeaveStatus> ACTIVE_STATUSES = EnumSet.of(
            LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_HR,
            LeaveStatus.ESCALATED, LeaveStatus.APPROVED
    );

    public static final Set<LeaveStatus> PENDING_STATUSES = EnumSet.of(
            LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_HR, LeaveStatus.ESCALATED
    );
}
