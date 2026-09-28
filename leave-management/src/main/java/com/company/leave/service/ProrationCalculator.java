package com.company.leave.service;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

/**
 * Computes pro-rated annual leave entitlement.
 *
 * Rule: if joinDate is in the current year, entitled = round½(entitlement × remaining/daysInYear)
 * otherwise the full entitlement applies.
 *
 * round½ = round to nearest 0.5 (e.g. 12.1 → 12.0, 12.3 → 12.5)
 */
@Component
public class ProrationCalculator {

    /**
     * @param joinDate          employee join date
     * @param year              leave year
     * @param annualEntitlement full-year entitlement (e.g. 24)
     * @return pro-rated entitlement, rounded to nearest 0.5
     */
    public BigDecimal prorate(LocalDate joinDate, int year, BigDecimal annualEntitlement) {
        if (joinDate.getYear() < year) {
            return annualEntitlement;
        }
        if (joinDate.getYear() > year) {
            return BigDecimal.ZERO;
        }
        // Same year: remaining days from joinDate to Dec 31 (inclusive)
        LocalDate yearEnd = LocalDate.of(year, 12, 31);
        long remaining = joinDate.datesUntil(yearEnd.plusDays(1)).count();
        long daysInYear = LocalDate.of(year, 1, 1).isLeapYear() ? 366L : 365L;

        BigDecimal raw = annualEntitlement
                .multiply(BigDecimal.valueOf(remaining))
                .divide(BigDecimal.valueOf(daysInYear), 4, RoundingMode.HALF_UP);

        return roundToNearestHalf(raw);
    }

    /** Round to nearest 0.5 */
    public static BigDecimal roundToNearestHalf(BigDecimal value) {
        // multiply by 2, round normally, divide by 2
        BigDecimal doubled = value.multiply(BigDecimal.valueOf(2));
        BigDecimal rounded = doubled.setScale(0, RoundingMode.HALF_UP);
        return rounded.divide(BigDecimal.valueOf(2), 1, RoundingMode.UNNECESSARY);
    }
}
