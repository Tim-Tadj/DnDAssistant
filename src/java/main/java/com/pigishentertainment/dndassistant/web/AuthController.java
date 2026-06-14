package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.UserRepository;
import com.pigishentertainment.dndassistant.domain.User;
import com.pigishentertainment.dndassistant.security.JwtService;
import com.pigishentertainment.dndassistant.security.UserAuthentication;
import io.jsonwebtoken.Claims;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Phase 5: signup, login, and {@code /me}.
 *
 *   POST /api/v1/auth/signup   {username, email?, password, display_name?}
 *   POST /api/v1/auth/login    {username, password}
 *   GET  /api/v1/auth/me       (Bearer required) → {id, username, ...}
 *
 * On success, signup and login return a JSON Web Token which the
 * client stores and sends back as {@code Authorization: Bearer <token>}.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final UserRepository users;
  private final PasswordEncoder encoder;
  private final JwtService jwt;

  public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
    this.users = users;
    this.encoder = encoder;
    this.jwt = jwt;
  }

  @PostMapping("/signup")
  public ResponseEntity<?> signup(@RequestBody SignupRequest body) {
    if (body == null || body.username == null || body.username.isBlank()) {
      throw new IllegalArgumentException("username is required");
    }
    if (body.password == null || body.password.length() < 8) {
      throw new IllegalArgumentException("password must be at least 8 characters");
    }
    if (users.findByUsername(body.username).isPresent()) {
      throw new IllegalStateException("Username '" + body.username + "' is already taken");
    }
    User u = new User();
    u.setId(UUID.randomUUID().toString());
    u.setUsername(body.username);
    u.setEmail(body.email);
    u.setDisplayName(body.display_name != null ? body.display_name : body.username);
    String hash = encoder.encode(body.password);
    User saved = users.insert(u, hash);
    String token = jwt.issueToken(saved.getId(), saved.getUsername());
    return ResponseEntity.status(HttpStatus.CREATED).body(tokenResponse(token, saved));
  }

  @PostMapping("/login")
  public Map<String, Object> login(@RequestBody LoginRequest body) {
    if (body == null || body.username == null || body.password == null) {
      throw new IllegalArgumentException("username and password are required");
    }
    Optional<String> hashOpt = users.findPasswordHashByUsername(body.username);
    if (hashOpt.isEmpty() || !encoder.matches(body.password, hashOpt.get())) {
      throw new IllegalArgumentException("Invalid username or password");
    }
    User u = users.findByUsername(body.username).orElseThrow();
    String token = jwt.issueToken(u.getId(), u.getUsername());
    return tokenResponse(token, u);
  }

  @GetMapping("/me")
  public Map<String, Object> me() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (!(auth instanceof UserAuthentication)) {
      throw new IllegalArgumentException("Not authenticated");
    }
    String userId = ((UserAuthentication) auth).getUserId();
    User u = users.findById(userId).orElseThrow();
    Map<String, Object> resp = new HashMap<>();
    resp.put("id", u.getId());
    resp.put("username", u.getUsername());
    resp.put("email", u.getEmail());
    resp.put("display_name", u.getDisplayName());
    return resp;
  }

  private Map<String, Object> tokenResponse(String token, User u) {
    Map<String, Object> resp = new HashMap<>();
    resp.put("token", token);
    resp.put("user", Map.of(
        "id", u.getId(),
        "username", u.getUsername(),
        "email", u.getEmail() == null ? "" : u.getEmail(),
        "display_name", u.getDisplayName() == null ? u.getUsername() : u.getDisplayName()
    ));
    return resp;
  }

  public static class SignupRequest {
    public String username;
    public String email;
    public String password;
    public String display_name;
  }

  public static class LoginRequest {
    public String username;
    public String password;
  }
}
