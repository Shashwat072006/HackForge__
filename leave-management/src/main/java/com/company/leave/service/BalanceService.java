package com.company.leave.service;

import com.company.leave.domain.*;
import com.company.leave.domain.exception.ResourceNotFoundException;
import com.company.leave.repository.*;
import com.company.leave.web.dto.BalanceDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BalanceService {

    private final LeaveBalanceRepository balanceRepo;
    private final LeaveTypeRepository leaveTypeRepo;
    private final EmployeeRepository employeeRepo;
    private final ProrationCalculator prorationCalc;

    @Transactional(readOnly = true)
    public List<BalanceDto> getMyBalances(Employee employee) {
        int year = LocalDate.now().getYear();
        return balanceRepo.findByEmployeeAndYear(employee, year).stream()
                .map(BalanceDto::from)
                .toList();
    }

    /**
     * Initialise leave balances for a new employee (called after HR creates one).
     */
    @Transactional
    public void initBalancesForEmployee(Employee employee, int year) {
        leaveTypeRepo.findAll().forEach(lt -> {
            if (balanceRepo.findByEmployeeAndLeaveTypeAndYear(employee, lt, year).isEmpty()) {
                BigDecimal entitled = prorationCalc.prorate(employee.getJoinDate(), year,
                        lt.getAnnualEntitlementDays().multiply(employee.getCapacityFte()));
                balanceRepo.save(LeaveBalance.builder()
                        .employee(employee).leaveType(lt).year(year)
                        .entitled(entitled).build());
            }
        });
    }

    /** Called when a leave request is submitted — adds to pending */
    @Transactional
    public void addPending(Employee employee, LeaveType lt, int year, BigDecimal days) {
        LeaveBalance b = getOrCreate(employee, lt, year);
        b.setPending(b.getPending().add(days));
        balanceRepo.save(b);
    }

    /** Called when manager/HR approves: pending→used */
    @Transactional
    public void approveDays(Employee employee, LeaveType lt, int year, BigDecimal days) {
        LeaveBalance b = getOrCreate(employee, lt, year);
        b.setPending(b.getPending().subtract(days).max(BigDecimal.ZERO));
        b.setUsed(b.getUsed().add(days));
        balanceRepo.save(b);
    }

    /** Called on rejection or cancellation of PENDING status */
    @Transactional
    public void removePending(Employee employee, LeaveType lt, int year, BigDecimal days) {
        LeaveBalance b = getOrCreate(employee, lt, year);
        b.setPending(b.getPending().subtract(days).max(BigDecimal.ZERO));
        balanceRepo.save(b);
    }

    /** Called on cancellation of APPROVED status */
    @Transactional
    public void removeUsed(Employee employee, LeaveType lt, int year, BigDecimal days) {
        LeaveBalance b = getOrCreate(employee, lt, year);
        b.setUsed(b.getUsed().subtract(days).max(BigDecimal.ZERO));
        balanceRepo.save(b);
    }

    @Transactional(readOnly = true)
    public BigDecimal getAvailable(Employee employee, LeaveType lt, int year) {
        return getOrCreate(employee, lt, year).getAvailable();
    }

    private LeaveBalance getOrCreate(Employee employee, LeaveType lt, int year) {
        return balanceRepo.findByEmployeeAndLeaveTypeAndYear(employee, lt, year)
                .orElseGet(() -> {
                    BigDecimal entitled = prorationCalc.prorate(employee.getJoinDate(), year,
                            lt.getAnnualEntitlementDays().multiply(employee.getCapacityFte()));
                    return balanceRepo.save(LeaveBalance.builder()
                            .employee(employee).leaveType(lt).year(year)
                            .entitled(entitled).build());
                });
    }
}
