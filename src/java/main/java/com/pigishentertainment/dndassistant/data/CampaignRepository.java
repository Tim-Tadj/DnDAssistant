package com.pigishentertainment.dndassistant.data;

import com.pigishentertainment.dndassistant.domain.Campaign;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Repository
public class CampaignRepository {

  private final NamedParameterJdbcTemplate jdbc;
  private final RowMapper<Campaign> rowMapper = (rs, rowNum) -> {
    Campaign c = new Campaign();
    c.setId(rs.getString("id"));
    c.setName(rs.getString("name"));
    c.setDescription(rs.getString("description"));
    c.setSetting(rs.getString("setting"));
    c.setStatus(rs.getString("status"));
    c.setNotes(rs.getString("notes"));
    c.setOwner_user_id(rs.getString("owner_user_id"));
    Timestamp created = rs.getTimestamp("created_at");
    if (created != null) c.setCreated_at(created.toInstant());
    Timestamp updated = rs.getTimestamp("updated_at");
    if (updated != null) c.setUpdated_at(updated.toInstant());
    return c;
  };

  public CampaignRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Campaign> findByOwner(String ownerUserId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("owner", ownerUserId, Types.OTHER);
    return jdbc.query(
        "SELECT * FROM campaigns WHERE owner_user_id = :owner ORDER BY name",
        p, rowMapper);
  }

  public Optional<Campaign> findById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    List<Campaign> rows = jdbc.query(
        "SELECT * FROM campaigns WHERE id = :id", p, rowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public Campaign insert(Campaign c) {
    jdbc.update(
        "INSERT INTO campaigns (id, name, description, setting, status, notes,"
            + " owner_user_id) VALUES (:id, :name, :description, :setting,"
            + " :status, :notes, :owner_user_id)",
        paramsFor(c));
    return findById(c.getId()).orElse(c);
  }

  public Campaign update(String id, Campaign c) {
    int rows = jdbc.update(
        "UPDATE campaigns SET name=:name, description=:description,"
            + " setting=:setting, status=:status, notes=:notes,"
            + " updated_at=NOW() WHERE id=:id",
        paramsFor(c).addValue("id", id, Types.OTHER));
    if (rows == 0) {
      throw new NoSuchElementException("Campaign " + id + " not found");
    }
    return findById(id).orElseThrow(() -> new NoSuchElementException("Campaign " + id + " not found"));
  }

  public void deleteById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    int rows = jdbc.update("DELETE FROM campaigns WHERE id = :id", p);
    if (rows == 0) {
      throw new NoSuchElementException("Campaign " + id + " not found");
    }
  }

  private static MapSqlParameterSource paramsFor(Campaign c) {
    return new MapSqlParameterSource()
        .addValue("id", c.getId(), Types.OTHER)
        .addValue("name", c.getName())
        .addValue("description", c.getDescription() == null ? "" : c.getDescription())
        .addValue("setting", c.getSetting() == null ? "" : c.getSetting())
        .addValue("status", c.getStatus() == null ? "active" : c.getStatus())
        .addValue("notes", c.getNotes() == null ? "" : c.getNotes())
        .addValue("owner_user_id", c.getOwner_user_id(), Types.OTHER);
  }
}
