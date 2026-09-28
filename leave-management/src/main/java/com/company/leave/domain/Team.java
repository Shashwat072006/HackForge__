package com.company.leave.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "team")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "max_concurrent_leave_percent", nullable = false)
    @Builder.Default
    private BigDecimal maxConcurrentLeavePercent = new BigDecimal("30");

    @Column(name = "productive_hours_per_day", nullable = false)
    @Builder.Default
    private BigDecimal productiveHoursPerDay = new BigDecimal("6");

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
