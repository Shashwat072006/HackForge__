package com.company.leave.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "leave_type")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LeaveType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 20)
    private LeaveTypeCode code;

    @Column(nullable = false)
    private String name;

    @Column(name = "annual_entitlement_days", nullable = false)
    private BigDecimal annualEntitlementDays;

    @Column(name = "requires_balance", nullable = false)
    @Builder.Default
    private boolean requiresBalance = true;
}
