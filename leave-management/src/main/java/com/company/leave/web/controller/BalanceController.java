package com.company.leave.web.controller;

import com.company.leave.domain.Employee;
import com.company.leave.service.BalanceService;
import com.company.leave.web.dto.BalanceDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/balances")
@RequiredArgsConstructor
@Tag(name = "Balances")
public class BalanceController {

    private final BalanceService balanceService;

    @GetMapping("/my")
    @Operation(summary = "Get my leave balances for the current year")
    public ResponseEntity<List<BalanceDto>> myBalances(@AuthenticationPrincipal Employee employee) {
        return ResponseEntity.ok(balanceService.getMyBalances(employee));
    }
}
