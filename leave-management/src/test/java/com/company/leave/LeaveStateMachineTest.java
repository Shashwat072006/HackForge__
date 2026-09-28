package com.company.leave;

import com.company.leave.domain.*;
import com.company.leave.service.LeaveStateMachine;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LeaveStateMachineTest {

    private final LeaveStateMachine sm = new LeaveStateMachine();

    private LeaveRequest requestInStatus(LeaveStatus status) {
        return LeaveRequest.builder()
                .startDate(LocalDate.now().plusDays(5))
                .endDate(LocalDate.now().plusDays(7))
                .workingDays(new BigDecimal("3"))
                .status(status).build();
    }

    @Test void managerApproveMovesToPendingHr() {
        LeaveRequest lr = requestInStatus(LeaveStatus.PENDING_MANAGER);
        assertThat(sm.transition(lr, LeaveEvent.MANAGER_APPROVE)).isEqualTo(LeaveStatus.PENDING_HR);
    }

    @Test void managerRejectMovesToRejected() {
        LeaveRequest lr = requestInStatus(LeaveStatus.PENDING_MANAGER);
        assertThat(sm.transition(lr, LeaveEvent.MANAGER_REJECT)).isEqualTo(LeaveStatus.REJECTED);
    }

    @Test void hrApproveMovesToApproved() {
        LeaveRequest lr = requestInStatus(LeaveStatus.PENDING_HR);
        assertThat(sm.transition(lr, LeaveEvent.HR_APPROVE)).isEqualTo(LeaveStatus.APPROVED);
    }

    @Test void escalatedHrApproveMovesToApproved() {
        LeaveRequest lr = requestInStatus(LeaveStatus.ESCALATED);
        assertThat(sm.transition(lr, LeaveEvent.HR_APPROVE)).isEqualTo(LeaveStatus.APPROVED);
    }

    @Test void cancelApprovedMovesToCancelled() {
        LeaveRequest lr = requestInStatus(LeaveStatus.APPROVED);
        assertThat(sm.transition(lr, LeaveEvent.CANCEL)).isEqualTo(LeaveStatus.CANCELLED);
    }

    @Test void invalidTransitionThrows() {
        LeaveRequest lr = requestInStatus(LeaveStatus.APPROVED);
        assertThatThrownBy(() -> sm.transition(lr, LeaveEvent.MANAGER_APPROVE))
                .isInstanceOf(com.company.leave.domain.exception.InvalidStateTransitionException.class);
    }

    @Test void rejectedCannotBeActedOn() {
        LeaveRequest lr = requestInStatus(LeaveStatus.REJECTED);
        assertThatThrownBy(() -> sm.transition(lr, LeaveEvent.HR_APPROVE))
                .isInstanceOf(com.company.leave.domain.exception.InvalidStateTransitionException.class);
    }
}
