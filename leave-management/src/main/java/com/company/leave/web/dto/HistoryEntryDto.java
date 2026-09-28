package com.company.leave.web.dto;

/** Frontend-compatible history entry: { at, actor, action, comment } */
public record HistoryEntryDto(String at, String actor, String action, String comment) {}
