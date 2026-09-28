package com.company.leave.service;

import com.company.leave.domain.Employee;
import com.company.leave.domain.Notification;
import com.company.leave.domain.EmployeeRole;
import com.company.leave.repository.EmployeeRepository;
import com.company.leave.repository.NotificationRepository;
import com.company.leave.web.dto.NotificationDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepo;
    private final EmployeeRepository employeeRepo;

    @Transactional
    public void notify(Employee employee, String message) {
        notificationRepo.save(Notification.builder()
                .employee(employee).message(message).build());
    }

    @Transactional
    public void notifyAllHr(String message) {
        employeeRepo.findByRole(EmployeeRole.HR).forEach(hr -> notify(hr, message));
        employeeRepo.findByRole(EmployeeRole.ADMIN).forEach(admin -> notify(admin, message));
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getMyNotifications(Employee employee) {
        return notificationRepo.findByEmployeeOrderByCreatedAtDesc(employee)
                .stream().map(NotificationDto::from).toList();
    }

    @Transactional
    public void markRead(Employee employee, Long notificationId) {
        notificationRepo.findById(notificationId).ifPresent(n -> {
            if (n.getEmployee().getId().equals(employee.getId())) {
                n.setRead(true);
                notificationRepo.save(n);
            }
        });
    }

    @Transactional
    public void markAllRead(Employee employee) {
        notificationRepo.findByEmployeeAndRead(employee, false).forEach(n -> {
            n.setRead(true);
            notificationRepo.save(n);
        });
    }
}
