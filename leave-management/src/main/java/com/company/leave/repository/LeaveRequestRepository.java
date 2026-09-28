package com.company.leave.repository;

import com.company.leave.domain.Employee;
import com.company.leave.domain.LeaveRequest;
import com.company.leave.domain.LeaveStatus;
import com.company.leave.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    List<LeaveRequest> findByEmployeeOrderByCreatedAtDesc(Employee employee);

    List<LeaveRequest> findByEmployeeAndStatusOrderByCreatedAtDesc(Employee employee, LeaveStatus status);

    List<LeaveRequest> findByEmployeeAndStatusIn(Employee employee, List<LeaveStatus> statuses);

    /** Direct reports of a manager */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.manager.id = :managerId AND lr.status IN :statuses ORDER BY lr.createdAt DESC")
    List<LeaveRequest> findByManagerAndStatusIn(@Param("managerId") Long managerId, @Param("statuses") List<LeaveStatus> statuses);

    /** HR view */
    List<LeaveRequest> findByStatusInOrderByCreatedAtDesc(List<LeaveStatus> statuses);

    /** Teammates on leave on a given day (for capacity) */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.team = :team " +
           "AND lr.status IN :statuses AND lr.startDate <= :date AND lr.endDate >= :date " +
           "AND lr.employee != :requester")
    List<LeaveRequest> findTeamLeaveOnDate(
            @Param("team") Team team,
            @Param("statuses") List<LeaveStatus> statuses,
            @Param("date") LocalDate date,
            @Param("requester") Employee requester);

    /** Overlap check: same employee, overlapping dates, active statuses */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee = :emp " +
           "AND lr.status IN :statuses " +
           "AND lr.startDate <= :endDate AND lr.endDate >= :startDate " +
           "AND (:excludeId IS NULL OR lr.id != :excludeId)")
    List<LeaveRequest> findOverlapping(
            @Param("emp") Employee emp,
            @Param("statuses") List<LeaveStatus> statuses,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("excludeId") Long excludeId);

    /** For escalation job */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.status IN :statuses AND lr.currentStageDeadline < :now")
    List<LeaveRequest> findOverdueRequests(@Param("statuses") List<LeaveStatus> statuses,
                                           @Param("now") LocalDateTime now);

    /** For team availability heatmap */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.team = :team " +
           "AND lr.status IN :statuses AND lr.startDate <= :to AND lr.endDate >= :from")
    List<LeaveRequest> findTeamLeaveInRange(
            @Param("team") Team team,
            @Param("statuses") List<LeaveStatus> statuses,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /** For report: approved leave overlapping a period, optionally filtered by team */
    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.status = 'APPROVED' " +
           "AND lr.startDate <= :to AND lr.endDate >= :from " +
           "AND (:teamId IS NULL OR lr.employee.team.id = :teamId) " +
           "ORDER BY lr.employee.team.name, lr.employee.name")
    List<LeaveRequest> findApprovedForReport(
            @Param("from") LocalDate from, @Param("to") LocalDate to,
            @Param("teamId") Long teamId);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.team = :team " +
           "AND lr.status IN :statuses AND lr.startDate <= :to AND lr.endDate >= :from " +
           "ORDER BY lr.createdAt ASC, lr.startDate ASC")
    List<LeaveRequest> findTeamPendingInRange(
            @Param("team") Team team, @Param("statuses") List<LeaveStatus> statuses,
            @Param("from") LocalDate from, @Param("to") LocalDate to);
}
