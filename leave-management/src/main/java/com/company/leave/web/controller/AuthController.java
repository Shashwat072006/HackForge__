package com.company.leave.web.controller;

import com.company.leave.config.JwtService;
import com.company.leave.domain.Employee;
import com.company.leave.web.dto.LoginRequest;
import com.company.leave.web.dto.LoginResponse;
import com.company.leave.web.dto.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @PostMapping("/auth/login")
    @Operation(summary = "Login and receive JWT token")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        var auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password()));
        Employee employee = (Employee) auth.getPrincipal();
        String token = jwtService.generateToken(employee, employee.getId(), employee.getRole().name());
        return ResponseEntity.ok(new LoginResponse(token, 86400000L, UserDto.from(employee)));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user profile")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal Employee employee) {
        return ResponseEntity.ok(UserDto.from(employee));
    }
}
