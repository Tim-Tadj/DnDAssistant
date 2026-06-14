package com.pigishentertainment.dndassistant.data;

import com.pigishentertainment.dndassistant.domain.User;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.util.List;
import java.util.Optional;

@Repository
public class UserRepository {

  private static final String COLUMNS =
      "id, username, email, password_hash, display_name, created_at, updated_at";

  private final NamedParameterJdbcTemplate jdbc;

  public UserRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  private final RowMapper<User> rowMapper = (rs, rowNum) -> {
    User u = new User();
    u.setId(rs.getString("id"));
    u.setUsername(rs.getString("username"));
    u.setEmail(rs.getString("email"));
    u.setDisplayName(rs.getString("display_name"));
    Timestamp created = rs.getTimestamp("created_at");
    if (created != null) u.setCreatedAt(created.toInstant());
    Timestamp updated = rs.getTimestamp("updated_at");
    if (updated != null) u.setUpdatedAt(updated.toInstant());
    return u;
  };

  public Optional<User> findById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    List<User> rows = jdbc.query(
        "SELECT id, username, email, display_name, created_at, updated_at"
            + " FROM users WHERE id = :id",
        p, rowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public Optional<String> findPasswordHashByUsername(String username) {
    List<String> rows = jdbc.query(
        "SELECT password_hash FROM users WHERE lower(username) = lower(:u)",
        new MapSqlParameterSource("u", username),
        (rs, rowNum) -> rs.getString(1));
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public Optional<User> findByUsername(String username) {
    List<User> rows = jdbc.query(
        "SELECT " + COLUMNS.replace("password_hash, ", "")
            + " FROM users WHERE lower(username) = lower(:u)",
        new MapSqlParameterSource("u", username),
        rowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public User insert(User u, String passwordHash) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", u.getId(), Types.OTHER);
    p.addValue("username", u.getUsername());
    p.addValue("email", u.getEmail());
    p.addValue("password_hash", passwordHash);
    p.addValue("display_name", u.getDisplayName());
    try {
      jdbc.update(
          "INSERT INTO users (id, username, email, password_hash, display_name)"
              + " VALUES (:id, :username, :email, :password_hash, :display_name)",
          p);
    } catch (DuplicateKeyException e) {
      throw new IllegalStateException(
          "Username '" + u.getUsername() + "' is already taken", e);
    }
    return findById(u.getId()).orElse(u);
  }
}
