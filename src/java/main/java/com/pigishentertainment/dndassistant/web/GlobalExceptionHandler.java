package com.pigishentertainment.dndassistant.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.NoSuchElementException;

@ControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(NoSuchElementException.class)
  public ResponseEntity<ApiError> notFound(NoSuchElementException e) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiError.of("NOT_FOUND", e.getMessage()));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ApiError> badRequest(IllegalArgumentException e) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiError.of("BAD_REQUEST", e.getMessage()));
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<ApiError> conflict(IllegalStateException e) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiError.of("CONFLICT", e.getMessage()));
  }
}
