package com.company.leave.domain.exception;

import lombok.Getter;

import java.util.List;

@Getter
public class UploadInvalidException extends RuntimeException {

    private final List<RowError> rowErrors;

    public UploadInvalidException(String message, List<RowError> rowErrors) {
        super(message);
        this.rowErrors = rowErrors;
    }

    public record RowError(int row, String message) {}
}
