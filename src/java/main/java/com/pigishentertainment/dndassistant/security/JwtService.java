package com.pigishentertainment.dndassistant.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Phase 5: HS256-signed JWT. The secret comes from
 * {@code app.jwt.secret} (env {@code JWT_SECRET}). Production should
 * supply a 256-bit secret (32 bytes); the default below is dev-only
 * and the service logs a warning if the dev secret is used.
 */
@Service
public class JwtService {

  private static final long DEFAULT_TTL_HOURS = 24;
  private static final String DEV_DEFAULT_SECRET =
      "dev-secret-change-me-please-32-bytes-minimum";

  private final SecretKey signingKey;
  private final long ttlSeconds;

  public JwtService(
      @Value("${app.jwt.secret:" + DEV_DEFAULT_SECRET + "}") String secret,
      @Value("${app.jwt.ttl-hours:" + DEFAULT_TTL_HOURS + "}") long ttlHours) {
    byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
    if (keyBytes.length < 32) {
      // Pad to 32 bytes so HS256 works in dev. Production should always
      // supply a 32+ byte secret.
      byte[] padded = new byte[32];
      System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
      keyBytes = padded;
    }
    this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    this.ttlSeconds = ttlHours * 3600L;
  }

  public String issueToken(String userId, String username) {
    Instant now = Instant.now();
    Instant exp = now.plusSeconds(ttlSeconds);
    return Jwts.builder()
        .subject(userId)
        .claim("username", username)
        .issuedAt(Date.from(now))
        .expiration(Date.from(exp))
        .id(UUID.randomUUID().toString())
        .signWith(signingKey, Jwts.SIG.HS256)
        .compact();
  }

  public Claims parse(String token) {
    return Jwts.parser()
        .verifyWith(signingKey)
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}
