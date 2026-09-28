package com.company.leave.repository;

import com.company.leave.domain.Employee;
import com.company.leave.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByEmployeeOrderByCreatedAtDesc(Employee employee);

    List<Notification> findByEmployeeAndRead(Employee employee, boolean read);

    long countByEmployeeAndRead(Employee employee, boolean read);
}
