package com.company.leave.repository;

import com.company.leave.domain.Team;
import com.company.leave.domain.WorkloadUploadBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkloadUploadBatchRepository extends JpaRepository<WorkloadUploadBatch, Long> {
    List<WorkloadUploadBatch> findByTeamOrderByCreatedAtDesc(Team team);
}
