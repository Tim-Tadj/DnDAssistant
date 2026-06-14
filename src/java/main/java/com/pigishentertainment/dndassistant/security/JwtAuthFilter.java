package com.pigishentertainment.dndassistant.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Reads {@code Authorization: Bearer <jwt>} on every request, verifies
 * the token, and populates the Spring SecurityContext with a
 * {@link UserAuthentication}. Endpoints can then call
 * {@code SecurityContextHolder.getContext().getAuthentication()} and
 * downcast to read the user id.
 *
 * Missing or invalid tokens are silently ignored — public endpoints
 * ({@code /api/v1/auth/*}, {@code /api/v1/health}, etc.) don't need
 * auth. The {@code SecurityConfig} decides which paths require auth
 * via {@code .authenticated()}; the filter just attaches the principal
 * when present.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtService jwt;

  public JwtAuthFilter(JwtService jwt) {
    this.jwt = jwt;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest req, HttpServletResponse resp, FilterChain chain)
      throws ServletException, IOException {
    String header = req.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      String token = header.substring("Bearer ".length()).trim();
      try {
        Claims claims = jwt.parse(token);
        String userId = claims.getSubject();
        String username = claims.get("username", String.class);
        if (userId != null) {
          UserAuthentication auth = new UserAuthentication(userId, username);
          SecurityContextHolder.getContext().setAuthentication(auth);
        }
      } catch (JwtException ignored) {
        // Bad/expired token — treat as anonymous. The security config
        // will reject the request if the path requires auth.
      }
    }
    chain.doFilter(req, resp);
  }
}
