package com.company.leave.repository;

import com.company.leave.domain.GeneratedReport;
import com.company.leave.domain.ReportType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface GeneratedReportRepository extends JpaRepository<GeneratedReport, Long> {

    Optional<GeneratedReport> findByTypeAndPeriodFromAndPeriodTo(
            ReportType type, LocalDate periodFrom, LocalDate periodTo);

    List<GeneratedReport> findAllByOrderByGeneratedAtDesc();
}
