package com.company.leave.repository;

import com.company.leave.domain.ApprovalHistory;
import com.company.leave.domain.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApprovalHistoryRepository extends JpaRepository<ApprovalHistory, Long> {

    List<ApprovalHistory> findByLeaveRequestOrderByCreatedAtAsc(LeaveRequest leaveRequest);
}
