package com.company.leave.web;

import com.company.leave.domain.exception.ForbiddenActionException;
import com.company.leave.domain.exception.InsufficientBalanceException;
import com.company.leave.domain.exception.InvalidStateTransitionException;
import com.company.leave.domain.exception.OverlappingRequestException;
import com.company.leave.domain.exception.ResourceNotFoundException;
import com.company.leave.domain.exception.UploadInvalidException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // --- Domain exceptions ---

    @ExceptionHandler(InvalidStateTransitionException.class)
    public ResponseEntity<ProblemDetail> handleInvalidStateTransition(InvalidStateTransitionException ex) {
        return problem(HttpStatus.CONFLICT, "INVALID_STATE_TRANSITION", ex.getMessage());
    }

    @ExceptionHandler(InsufficientBalanceException.class)
    public ResponseEntity<ProblemDetail> handleInsufficientBalance(InsufficientBalanceException ex) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "INSUFFICIENT_BALANCE", ex.getMessage());
    }

    @ExceptionHandler(OverlappingRequestException.class)
    public ResponseEntity<ProblemDetail> handleOverlapping(OverlappingRequestException ex) {
        return problem(HttpStatus.CONFLICT, "OVERLAPPING_REQUEST", ex.getMessage());
    }

    @ExceptionHandler(ForbiddenActionException.class)
    public ResponseEntity<ProblemDetail> handleForbiddenAction(ForbiddenActionException ex) {
        return problem(HttpStatus.FORBIDDEN, "FORBIDDEN_ACTION", ex.getMessage());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ResourceNotFoundException ex) {
        return problem(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(UploadInvalidException.class)
    public ResponseEntity<ProblemDetail> handleUploadInvalid(UploadInvalidException ex) {
        ProblemDetail pd = buildBase(HttpStatus.BAD_REQUEST, "UPLOAD_INVALID", ex.getMessage());
        if (ex.getRowErrors() != null) {
            pd.setProperty("errors", ex.getRowErrors());
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(pd);
    }

    // --- Spring / infrastructure exceptions ---

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ProblemDetail> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
        return problem(HttpStatus.CONFLICT, "CONCURRENT_MODIFICATION",
                "The resource was modified concurrently. Please retry.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException ex) {
        return problem(HttpStatus.FORBIDDEN, "FORBIDDEN_ACTION", "Access denied.");
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<ProblemDetail> handleAuthenticationException(
            org.springframework.security.core.AuthenticationException ex) {
        return problem(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Invalid credentials.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        return problem(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", detail);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> handleConstraintViolation(ConstraintViolationException ex) {
        String detail = ex.getConstraintViolations().stream()
                .map(cv -> cv.getPropertyPath() + ": " + cv.getMessage())
                .collect(Collectors.joining("; "));
        return problem(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", detail);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "An unexpected error occurred. Please contact support.");
    }

    // --- Helpers ---

    private ResponseEntity<ProblemDetail> problem(HttpStatus status, String code, String detail) {
        return ResponseEntity.status(status).body(buildBase(status, code, detail));
    }

    private ProblemDetail buildBase(HttpStatus status, String code, String detail) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setType(URI.create("about:blank"));
        pd.setProperty("code", code);
        pd.setProperty("timestamp", Instant.now().toString());
        return pd;
    }
}
