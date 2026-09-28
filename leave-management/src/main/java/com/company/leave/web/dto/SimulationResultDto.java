package com.company.leave.web.dto;

import java.math.BigDecimal;
import java.util.List;

public record SimulationResultDto(
        List<TaskSimResultDto> tasks,
        BigDecimal deliveryRatePercent,
        String summary
) {}
