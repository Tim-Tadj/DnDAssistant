package com.pigishentertainment.dndassistant.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;

import java.util.Collections;

/**
 * Carries the authenticated user id + username through Spring's
 * SecurityContext. Controllers can {@code SecurityContextHolder.getContext()
 * .getAuthentication()} and downcast to read the principal.
 */
public class UserAuthentication extends AbstractAuthenticationToken {

  private final String userId;
  private final String username;

  public UserAuthentication(String userId, String username) {
    super(Collections.emptyList());
    this.userId = userId;
    this.username = username;
    setAuthenticated(true);
  }

  @Override
  public Object getCredentials() {
    return null;
  }

  @Override
  public Object getPrincipal() {
    return userId;
  }

  public String getUserId() { return userId; }
  public String getUsername() { return username; }
}
