package com.company.leave.repository;

import com.company.leave.domain.Team;
import com.company.leave.domain.WorkloadTask;
import com.company.leave.domain.WorkloadUploadBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface WorkloadTaskRepository extends JpaRepository<WorkloadTask, Long> {

    List<WorkloadTask> findByBatch(WorkloadUploadBatch batch);

    @Query("SELECT t FROM WorkloadTask t WHERE t.team = :team " +
           "AND t.startDate <= :to AND t.dueDate >= :from " +
           "ORDER BY t.dueDate ASC, t.priority ASC, t.id ASC")
    List<WorkloadTask> findByTeamInRange(@Param("team") Team team,
                                         @Param("from") LocalDate from,
                                         @Param("to") LocalDate to);

    void deleteByBatch(WorkloadUploadBatch batch);
}
