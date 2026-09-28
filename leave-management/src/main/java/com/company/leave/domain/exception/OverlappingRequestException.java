package com.company.leave.domain.exception;

public class OverlappingRequestException extends RuntimeException {
    public OverlappingRequestException(String message) {
        super(message);
    }
}
