package com.company.leave.service;

import com.company.leave.domain.*;
import com.company.leave.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.time.DayOfWeek;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements ApplicationRunner {

    private final TeamRepository teamRepo;
    private final EmployeeRepository employeeRepo;
    private final LeaveTypeRepository leaveTypeRepo;
    private final LeaveBalanceRepository balanceRepo;
    private final HolidayRepository holidayRepo;
    private final PeakPeriodRepository peakRepo;
    private final LeaveRequestRepository leaveRequestRepo;
    private final ApprovalHistoryRepository historyRepo;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (teamRepo.findByName("Engineering").isPresent()) {
            log.info("Seed data already present — skipping DataSeeder");
            return;
        }
        log.info("Seeding demo data...");

        String hash = passwordEncoder.encode("Demo@123");
        int currentYear = LocalDate.now().getYear();

        // ── Teams ─────────────────────────────────────────────────────────
        Team eng = teamRepo.save(Team.builder()
                .name("Engineering")
                .maxConcurrentLeavePercent(new BigDecimal("30"))
                .productiveHoursPerDay(new BigDecimal("6"))
                .build());

        // ── Employees ─────────────────────────────────────────────────────
        Employee admin = employeeRepo.save(employee("Admin User", "admin@demo.com", hash, EmployeeRole.ADMIN, null, null, LocalDate.of(currentYear - 2, 1, 1), BigDecimal.ONE));
        Employee hr    = employeeRepo.save(employee("HR Manager", "hr@demo.com",    hash, EmployeeRole.HR,    null, null, LocalDate.of(currentYear - 2, 1, 1), BigDecimal.ONE));
        Employee mgr   = employeeRepo.save(employee("Dev Manager","manager@demo.com",hash,EmployeeRole.MANAGER,eng, null,LocalDate.of(currentYear - 2, 1, 1), BigDecimal.ONE));

        // 10 employees: alice–jack. frank & grace part-time (0.5). henry joined Jul 1 this year.
        LocalDate lastYear = LocalDate.of(currentYear - 1, 1, 1);
        LocalDate midYear  = LocalDate.of(currentYear, 7, 1);

        Employee alice = empEng("Alice Smith",   "alice@demo.com",  hash, eng, mgr, lastYear, BigDecimal.ONE);
        Employee bob   = empEng("Bob Jones",     "bob@demo.com",    hash, eng, mgr, lastYear, BigDecimal.ONE);
        Employee carol = empEng("Carol White",   "carol@demo.com",  hash, eng, mgr, lastYear, BigDecimal.ONE);
        Employee david = empEng("David Brown",   "david@demo.com",  hash, eng, mgr, lastYear, BigDecimal.ONE);
        Employee emily = empEng("Emily Davis",   "emily@demo.com",  hash, eng, mgr, lastYear, BigDecimal.ONE);
        Employee frank = empEng("Frank Miller",  "frank@demo.com",  hash, eng, mgr, lastYear, new BigDecimal("0.5"));
        Employee grace = empEng("Grace Wilson",  "grace@demo.com",  hash, eng, mgr, lastYear, new BigDecimal("0.5"));
        Employee henry = empEng("Henry Moore",   "henry@demo.com",  hash, eng, mgr, midYear,  BigDecimal.ONE);
        Employee iris  = empEng("Iris Taylor",   "iris@demo.com",   hash, eng, mgr, lastYear, BigDecimal.ONE);
        Employee jack  = empEng("Jack Anderson", "jack@demo.com",   hash, eng, mgr, lastYear, BigDecimal.ONE);

        // ── Leave Types ────────────────────────────────────────────────────
        LeaveType annual  = leaveTypeRepo.findByCode(LeaveTypeCode.ANNUAL).orElseThrow();
        LeaveType sick    = leaveTypeRepo.findByCode(LeaveTypeCode.SICK).orElseThrow();
        LeaveType casual  = leaveTypeRepo.findByCode(LeaveTypeCode.CASUAL).orElseThrow();
        LeaveType unpaid  = leaveTypeRepo.findByCode(LeaveTypeCode.UNPAID).orElseThrow();

        // ── Balances (current year) ────────────────────────────────────────
        // Henry joined Jul 1 → pro-rated: 184/365 × 24 ≈ 12.1 → round to 12.0
        BigDecimal henryEntitled = new BigDecimal("12.0");
        for (Employee emp : new Employee[]{alice, bob, carol, david, emily, frank, grace, iris, jack}) {
            createBalance(emp, annual, currentYear, new BigDecimal("24"), BigDecimal.ZERO);
            createBalance(emp, sick,   currentYear, new BigDecimal("10"), BigDecimal.ZERO);
            createBalance(emp, casual, currentYear, new BigDecimal("6"),  BigDecimal.ZERO);
            createBalance(emp, unpaid, currentYear, BigDecimal.ZERO,      BigDecimal.ZERO);
        }
        createBalance(henry, annual,  currentYear, henryEntitled, BigDecimal.ZERO);
        createBalance(henry, sick,    currentYear, new BigDecimal("5"), BigDecimal.ZERO);
        createBalance(henry, casual,  currentYear, new BigDecimal("3"), BigDecimal.ZERO);
        createBalance(henry, unpaid,  currentYear, BigDecimal.ZERO, BigDecimal.ZERO);

        // ── Company holiday ────────────────────────────────────────────────
        LocalDate nextMonth = LocalDate.now().plusMonths(1);
        LocalDate holidayDate = nextMonth.with(TemporalAdjusters.firstDayOfMonth());
        // Put holiday at start of next month (won't overlap conflict week)
        holidayRepo.save(Holiday.builder().date(holidayDate).name("Company Foundation Day").team(null).build());

        // ── Peak period (month-end of next month, ×1.3) ───────────────────
        LocalDate peakFrom = nextMonth.with(TemporalAdjusters.lastDayOfMonth()).minusDays(4);
        LocalDate peakTo   = nextMonth.with(TemporalAdjusters.lastDayOfMonth());
        peakRepo.save(PeakPeriod.builder().team(eng).fromDate(peakFrom).toDate(peakTo)
                .multiplier(new BigDecimal("1.3")).name("Month-End Close").build());

        // ── Conflict week: second Monday of next month ─────────────────────
        // Pattern: teammates out Mon:1, Tue:2, Wed:3, Thu:3, Fri:2
        // bob: Mon-Fri, carol: Tue-Fri, david: Wed-Thu
        LocalDate firstMon  = nextMonth.with(TemporalAdjusters.firstInMonth(DayOfWeek.MONDAY));
        LocalDate secondMon = firstMon.plusWeeks(1);
        LocalDate conflictEnd = secondMon.plusDays(4); // Friday

        // Ensure employees have enough balance
        adjustBalance(bob,   annual, currentYear, new BigDecimal("5"));
        adjustBalance(carol, annual, currentYear, new BigDecimal("4"));
        adjustBalance(david, annual, currentYear, new BigDecimal("2"));

        seedApprovedLeave(bob,   annual, secondMon,            conflictEnd,              new BigDecimal("5"), mgr, hr);
        seedApprovedLeave(carol, annual, secondMon.plusDays(1), conflictEnd,             new BigDecimal("4"), mgr, hr);
        seedApprovedLeave(david, annual, secondMon.plusDays(2), secondMon.plusDays(3),   new BigDecimal("2"), mgr, hr);

        // ── Historical requests in varied statuses ─────────────────────────
        // emily: one rejected request last month
        LeaveRequest rejected = leaveRequestRepo.save(LeaveRequest.builder()
                .employee(emily).leaveType(annual)
                .startDate(LocalDate.now().minusMonths(1))
                .endDate(LocalDate.now().minusMonths(1).plusDays(2))
                .workingDays(new BigDecimal("3")).reason("Vacation")
                .status(LeaveStatus.REJECTED).build());
        historyRepo.save(ApprovalHistory.builder().leaveRequest(rejected).actor(null)
                .fromStatus(null).toStatus(LeaveStatus.REJECTED)
                .action(LeaveEvent.SUBMIT).comment("Auto-rejected for demo").build());

        // iris: one PENDING_MANAGER (for escalation demo)
        LocalDate futureStart = LocalDate.now().plusDays(10);
        LeaveRequest pending = leaveRequestRepo.save(LeaveRequest.builder()
                .employee(iris).leaveType(annual)
                .startDate(futureStart).endDate(futureStart.plusDays(2))
                .workingDays(new BigDecimal("3")).reason("Personal")
                .status(LeaveStatus.PENDING_MANAGER)
                .currentStageDeadline(LocalDateTime.now().minusMinutes(5)) // already overdue for demo
                .build());
        historyRepo.save(ApprovalHistory.builder().leaveRequest(pending).actor(iris)
                .fromStatus(null).toStatus(LeaveStatus.PENDING_MANAGER)
                .action(LeaveEvent.SUBMIT).build());

        log.info("Demo seed complete. Conflict week starts {}", secondMon);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private Employee employee(String name, String email, String hash, EmployeeRole role,
                              Team team, Employee manager, LocalDate joinDate, BigDecimal fte) {
        return employeeRepo.save(Employee.builder()
                .name(name).email(email).passwordHash(hash).role(role)
                .team(team).manager(manager).joinDate(joinDate)
                .capacityFte(fte).active(true).build());
    }

    private Employee empEng(String name, String email, String hash, Team team,
                            Employee manager, LocalDate joinDate, BigDecimal fte) {
        return employee(name, email, hash, EmployeeRole.EMPLOYEE, team, manager, joinDate, fte);
    }

    private void createBalance(Employee emp, LeaveType lt, int year,
                               BigDecimal entitled, BigDecimal used) {
        balanceRepo.save(LeaveBalance.builder()
                .employee(emp).leaveType(lt).year(year)
                .entitled(entitled).used(used).pending(BigDecimal.ZERO)
                .carriedForward(BigDecimal.ZERO).build());
    }

    private void adjustBalance(Employee emp, LeaveType lt, int year, BigDecimal used) {
        balanceRepo.findByEmployeeAndLeaveTypeAndYear(emp, lt, year).ifPresent(b -> {
            b.setUsed(used);
            balanceRepo.save(b);
        });
    }

    private void seedApprovedLeave(Employee emp, LeaveType lt,
                                   LocalDate start, LocalDate end, BigDecimal days,
                                   Employee manager, Employee hrEmp) {
        LeaveRequest lr = leaveRequestRepo.save(LeaveRequest.builder()
                .employee(emp).leaveType(lt).startDate(start).endDate(end)
                .workingDays(days).reason("Pre-approved leave")
                .status(LeaveStatus.APPROVED).build());
        historyRepo.save(ApprovalHistory.builder().leaveRequest(lr).actor(emp)
                .fromStatus(null).toStatus(LeaveStatus.PENDING_MANAGER)
                .action(LeaveEvent.SUBMIT).build());
        historyRepo.save(ApprovalHistory.builder().leaveRequest(lr).actor(manager)
                .fromStatus(LeaveStatus.PENDING_MANAGER).toStatus(LeaveStatus.PENDING_HR)
                .action(LeaveEvent.MANAGER_APPROVE).build());
        historyRepo.save(ApprovalHistory.builder().leaveRequest(lr).actor(hrEmp)
                .fromStatus(LeaveStatus.PENDING_HR).toStatus(LeaveStatus.APPROVED)
                .action(LeaveEvent.HR_APPROVE).build());
    }
}
