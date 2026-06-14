package com.pigishentertainment.dndassistant.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Phase 5: stateless JWT auth. The default Spring Security form login
 * is disabled; clients send {@code Authorization: Bearer <jwt>} on
 * every request. {@link JwtAuthFilter} populates the principal.
 *
 * Authorization rules:
 *   - public: /api/v1/auth/**, /api/v1/health, /api/v1/spells/**,
 *     /api/v1/monsters/**, /api/v1/gear/** (read paths stay open so
 *     the app is browsable without an account).
 *   - anything else: requires a valid JWT.
 */
@Configuration
public class SecurityConfig {

  private final JwtAuthFilter jwtFilter;

  public SecurityConfig(JwtAuthFilter jwtFilter) {
    this.jwtFilter = jwtFilter;
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(AbstractHttpConfigurer::disable)
        .cors(cors -> {})
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            // Public reads: the resource browsers (GET /spells, /monsters,
            // /gear, /import/snapshot) and the auth + health endpoints.
            // /classes and /races are public read because they are
            // reference data; character CRUD requires auth.
            .requestMatchers(
                org.springframework.http.HttpMethod.GET,
                "/api/v1/spells/**",
                "/api/v1/monsters/**",
                "/api/v1/gear/**",
                "/api/v1/classes/**",
                "/api/v1/races/**",
                "/api/v1/import/snapshot"
            ).permitAll()
            // POST /import is the admin content-ingestion endpoint.
            // Phase 5 keeps it open (auth on import comes with the
            // broader admin role in a future phase).
            .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/v1/import")
                .permitAll()
            .requestMatchers(
                "/api/v1/auth/**",
                "/api/v1/health"
            ).permitAll()
            // Everything else under /api/v1 requires a valid JWT.
            .requestMatchers("/api/v1/**").authenticated()
            .anyRequest().permitAll()
        )
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }
}
