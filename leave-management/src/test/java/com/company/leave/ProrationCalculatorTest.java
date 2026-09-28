package com.company.leave;

import com.company.leave.service.ProrationCalculator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class ProrationCalculatorTest {

    private final ProrationCalculator calc = new ProrationCalculator();

    @Test void fullYearWhenJoinedLastYear() {
        // joined before the leave year → full entitlement
        assertThat(calc.prorate(LocalDate.of(2023, 1, 1), 2024, new BigDecimal("24")))
                .isEqualByComparingTo("24.0");
    }

    @Test void zeroWhenJoinedAfterLeaveYear() {
        assertThat(calc.prorate(LocalDate.of(2025, 1, 1), 2024, new BigDecimal("24")))
                .isEqualByComparingTo("0.0");
    }

    @Test void proratesJoinedMidYear() {
        // Jul 1 → 184 days remaining in non-leap year 2025 (365 days)
        // 24 × 184 / 365 = 12.0986... → round to nearest 0.5 → 12.0
        int year = 2025;
        BigDecimal result = calc.prorate(LocalDate.of(year, 7, 1), year, new BigDecimal("24"));
        assertThat(result).isEqualByComparingTo("12.0");
    }

    @Test void proratesJoinedOctober() {
        // Oct 1 2025 → 92 days remaining
        // 24 × 92 / 365 = 6.046... → round to 6.0
        int year = 2025;
        BigDecimal result = calc.prorate(LocalDate.of(year, 10, 1), year, new BigDecimal("24"));
        assertThat(result).isEqualByComparingTo("6.0");
    }

    @Test void roundsToNearestHalf() {
        assertThat(ProrationCalculator.roundToNearestHalf(new BigDecimal("12.1")))
                .isEqualByComparingTo("12.0");
        assertThat(ProrationCalculator.roundToNearestHalf(new BigDecimal("12.3")))
                .isEqualByComparingTo("12.5");
        assertThat(ProrationCalculator.roundToNearestHalf(new BigDecimal("12.75")))
                .isEqualByComparingTo("13.0");
    }
}
