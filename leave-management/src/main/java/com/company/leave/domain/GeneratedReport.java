package com.company.leave.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "generated_report")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GeneratedReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ReportType type = ReportType.MONTHLY_APPROVED;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "period_to", nullable = false)
    private LocalDate periodTo;

    @Column(name = "file_path", nullable = false)
    private String filePath;

    @Column(name = "row_count", nullable = false)
    @Builder.Default
    private int rowCount = 0;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    /** null = SYSTEM (scheduled job) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "generated_by")
    private Employee generatedBy;

    @PrePersist
    void prePersist() {
        if (generatedAt == null) generatedAt = LocalDateTime.now();
    }
}
