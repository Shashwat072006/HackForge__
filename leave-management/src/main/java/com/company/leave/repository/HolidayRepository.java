package com.company.leave.repository;

import com.company.leave.domain.Holiday;
import com.company.leave.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface HolidayRepository extends JpaRepository<Holiday, Long> {

    /** All holidays on a date that are company-wide OR for the given team */
    @Query("SELECT h FROM Holiday h WHERE h.date = :date AND (h.team IS NULL OR h.team = :team)")
    List<Holiday> findByDateAndTeamOrCompanyWide(@Param("date") LocalDate date, @Param("team") Team team);

    /** All holidays in a date range that are company-wide OR for the given team */
    @Query("SELECT h FROM Holiday h WHERE h.date BETWEEN :from AND :to AND (h.team IS NULL OR h.team = :team)")
    List<Holiday> findByDateBetweenAndTeamOrCompanyWide(
            @Param("from") LocalDate from, @Param("to") LocalDate to, @Param("team") Team team);

    List<Holiday> findByTeamIsNull();

    List<Holiday> findByTeamIsNullOrTeam(Team team);
}
