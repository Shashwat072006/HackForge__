package com.company.leave.repository;

import com.company.leave.domain.Employee;
import com.company.leave.domain.EmployeeRole;
import com.company.leave.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Optional<Employee> findByEmail(String email);

    List<Employee> findByManagerId(Long managerId);

    List<Employee> findByTeam(Team team);

    @Query("SELECT e FROM Employee e WHERE e.team = :team AND e.active = true AND e.joinDate <= :date")
    List<Employee> findActiveTeamMembersJoinedBy(@Param("team") Team team, @Param("date") LocalDate date);

    List<Employee> findByRole(EmployeeRole role);

    List<Employee> findByTeamAndActive(Team team, boolean active);
}
