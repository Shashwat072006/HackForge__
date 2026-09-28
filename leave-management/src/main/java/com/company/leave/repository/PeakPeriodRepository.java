package com.company.leave.repository;

import com.company.leave.domain.PeakPeriod;
import com.company.leave.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface PeakPeriodRepository extends JpaRepository<PeakPeriod, Long> {

    @Query("SELECT pp FROM PeakPeriod pp WHERE pp.team = :team AND pp.fromDate <= :date AND pp.toDate >= :date")
    List<PeakPeriod> findActiveOnDate(@Param("team") Team team, @Param("date") LocalDate date);

    List<PeakPeriod> findByTeam(Team team);
}
