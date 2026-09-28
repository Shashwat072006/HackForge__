package com.company.leave.repository;

import com.company.leave.domain.Employee;
import com.company.leave.domain.LeaveBalance;
import com.company.leave.domain.LeaveType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, Long> {

    Optional<LeaveBalance> findByEmployeeAndLeaveTypeAndYear(Employee employee, LeaveType leaveType, int year);

    List<LeaveBalance> findByEmployeeAndYear(Employee employee, int year);

    List<LeaveBalance> findByEmployee(Employee employee);
}
