package com.company.leave.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "peak_period")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PeakPeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = true)
    private Team team;

    @Column(name = "from_date", nullable = false)
    private LocalDate fromDate;

    @Column(name = "to_date", nullable = false)
    private LocalDate toDate;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal multiplier = BigDecimal.ONE;

    @Column(nullable = false)
    private String name;
}
