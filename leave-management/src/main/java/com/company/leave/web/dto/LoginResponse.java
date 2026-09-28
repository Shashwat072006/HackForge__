package com.company.leave.web.dto;

public record LoginResponse(String token, long expiresIn, UserDto user) {}
