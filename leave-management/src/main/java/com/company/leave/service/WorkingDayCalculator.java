package com.company.leave.service;

import com.company.leave.domain.Employee;
import com.company.leave.domain.Holiday;
import com.company.leave.repository.HolidayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Counts working days in a date range [start, end] inclusive,
 * excluding configured weekend days and public/team holidays.
 */
@Component
@RequiredArgsConstructor
public class WorkingDayCalculator {

    private final HolidayRepository holidayRepo;

    @Value("${leave.weekend-days:SATURDAY,SUNDAY}")
    private String weekendDaysConfig;

    public int countWorkingDays(LocalDate start, LocalDate end, Employee employee) {
        Set<DayOfWeek> weekends = resolveWeekends();
        Set<LocalDate> holidays = resolveHolidayDates(start, end, employee);

        int count = 0;
        LocalDate d = start;
        while (!d.isAfter(end)) {
            if (!weekends.contains(d.getDayOfWeek()) && !holidays.contains(d)) {
                count++;
            }
            d = d.plusDays(1);
        }
        return count;
    }

    public boolean isWorkingDay(LocalDate date, Employee employee) {
        Set<DayOfWeek> weekends = resolveWeekends();
        if (weekends.contains(date.getDayOfWeek())) return false;
        List<Holiday> holidays = employee.getTeam() != null
                ? holidayRepo.findByDateAndTeamOrCompanyWide(date, employee.getTeam())
                : holidayRepo.findByTeamIsNull().stream()
                    .filter(h -> h.getDate().equals(date)).toList();
        return holidays.isEmpty();
    }

    Set<DayOfWeek> resolveWeekends() {
        return java.util.Arrays.stream(weekendDaysConfig.split(","))
                .map(String::trim)
                .map(DayOfWeek::valueOf)
                .collect(Collectors.toSet());
    }

    private Set<LocalDate> resolveHolidayDates(LocalDate from, LocalDate to, Employee employee) {
        List<Holiday> holidays = employee.getTeam() != null
                ? holidayRepo.findByDateBetweenAndTeamOrCompanyWide(from, to, employee.getTeam())
                : holidayRepo.findByTeamIsNull().stream()
                    .filter(h -> !h.getDate().isBefore(from) && !h.getDate().isAfter(to))
                    .toList();
        return holidays.stream().map(Holiday::getDate).collect(Collectors.toSet());
    }
}
