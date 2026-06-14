package com.pigishentertainment.dndassistant.data;

import com.pigishentertainment.dndassistant.domain.DndClass;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.List;
import java.util.Optional;

@Repository
public class ClassRepository {

  private final NamedParameterJdbcTemplate jdbc;
  private final RowMapper<DndClass> rowMapper = (rs, rowNum) -> {
    DndClass c = new DndClass();
    c.setId(rs.getLong("id"));
    c.setName(rs.getString("name"));
    c.setHitDie(rs.getString("hit_die"));
    c.setPrimaryAbility(rs.getString("primary_ability"));
    c.setDescription(rs.getString("description"));
    c.setSource(rs.getString("source"));
    return c;
  };

  public ClassRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<DndClass> findAll() {
    return jdbc.query("SELECT * FROM classes ORDER BY name", rowMapper);
  }

  public Optional<DndClass> findById(long id) {
    List<DndClass> rows = jdbc.query(
        "SELECT * FROM classes WHERE id = :id",
        new MapSqlParameterSource("id", id),
        rowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public DndClass insert(DndClass c) {
    try {
      jdbc.update(
          "INSERT INTO classes (name, hit_die, primary_ability, description, source)"
              + " VALUES (:name, :hit_die, :primary_ability, :description, :source)",
          new MapSqlParameterSource()
              .addValue("name", c.getName())
              .addValue("hit_die", c.getHitDie() == null ? "d8" : c.getHitDie())
              .addValue("primary_ability", c.getPrimaryAbility() == null ? "" : c.getPrimaryAbility())
              .addValue("description", c.getDescription() == null ? "" : c.getDescription())
              .addValue("source", c.getSource() == null ? "srd" : c.getSource()));
    } catch (DuplicateKeyException e) {
      throw new IllegalStateException("A class named '" + c.getName() + "' already exists", e);
    }
    return c;
  }
}
