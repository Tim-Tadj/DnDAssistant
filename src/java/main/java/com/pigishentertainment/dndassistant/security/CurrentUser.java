package com.pigishentertainment.dndassistant.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Helper for controllers. Returns the current user's id, or null if
 * the request is unauthenticated. Use this for ownership checks.
 */
public final class CurrentUser {
  private CurrentUser() {}

  public static String idOrNull() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth instanceof UserAuthentication) {
      return ((UserAuthentication) auth).getUserId();
    }
    return null;
  }

  public static boolean isAuthenticated() {
    return idOrNull() != null;
  }
}
