package com.pigishentertainment.dndassistant.web;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiError {
  private final String code;
  private final String message;

  public ApiError(String code, String message) {
    this.code = code;
    this.message = message;
  }

  public String getCode() { return code; }
  public String getMessage() { return message; }

  public static ApiError of(String code, String message) {
    return new ApiError(code, message);
  }
}
