package com.company.leave.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "leave_balance",
       uniqueConstraints = @UniqueConstraint(columnNames = {"employee_id","leave_type_id","year"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LeaveBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @Column(name = "\"year\"", nullable = false)
    private int year;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal entitled = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal used = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal pending = BigDecimal.ZERO;

    @Column(name = "carried_forward", nullable = false)
    @Builder.Default
    private BigDecimal carriedForward = BigDecimal.ZERO;

    @Transient
    public BigDecimal getAvailable() {
        return entitled.add(carriedForward).subtract(used).subtract(pending);
    }
}
