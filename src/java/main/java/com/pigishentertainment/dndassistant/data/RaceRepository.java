package com.pigishentertainment.dndassistant.data;

import com.pigishentertainment.dndassistant.domain.Race;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class RaceRepository {

  private final NamedParameterJdbcTemplate jdbc;
  private final RowMapper<Race> rowMapper = (rs, rowNum) -> {
    Race r = new Race();
    r.setId(rs.getLong("id"));
    r.setName(rs.getString("name"));
    r.setSize(rs.getString("size"));
    r.setSpeed(rs.getInt("speed"));
    r.setAbilityBonuses(rs.getString("ability_bonuses"));
    r.setTraits(rs.getString("traits"));
    r.setSource(rs.getString("source"));
    return r;
  };

  public RaceRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Race> findAll() {
    return jdbc.query("SELECT * FROM races ORDER BY name", rowMapper);
  }

  public Optional<Race> findById(long id) {
    List<Race> rows = jdbc.query(
        "SELECT * FROM races WHERE id = :id",
        new MapSqlParameterSource("id", id),
        rowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public Race insert(Race r) {
    try {
      jdbc.update(
          "INSERT INTO races (name, size, speed, ability_bonuses, traits, source)"
              + " VALUES (:name, :size, :speed, :ability_bonuses, :traits, :source)",
          new MapSqlParameterSource()
              .addValue("name", r.getName())
              .addValue("size", r.getSize() == null ? "Medium" : r.getSize())
              .addValue("speed", r.getSpeed() == null ? 30 : r.getSpeed())
              .addValue("ability_bonuses", r.getAbilityBonuses() == null ? "" : r.getAbilityBonuses())
              .addValue("traits", r.getTraits() == null ? "" : r.getTraits())
              .addValue("source", r.getSource() == null ? "srd" : r.getSource()));
    } catch (DuplicateKeyException e) {
      throw new IllegalStateException("A race named '" + r.getName() + "' already exists", e);
    }
    return r;
  }
}
