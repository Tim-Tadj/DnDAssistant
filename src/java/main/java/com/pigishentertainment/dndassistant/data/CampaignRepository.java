package com.pigishentertainment.dndassistant.data;

import com.pigishentertainment.dndassistant.domain.Campaign;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
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
    Date next = rs.getDate("next_session_on");
    if (next != null) c.setNext_session_on(next.toLocalDate());
    c.setCadence(rs.getString("cadence"));
    Date started = rs.getDate("started_on");
    if (started != null) c.setStarted_on(started.toLocalDate());
    c.setArchived(rs.getBoolean("archived"));
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
        "SELECT * FROM campaigns WHERE owner_user_id = :owner"
            + " ORDER BY archived ASC, next_session_on ASC NULLS LAST, name",
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
            + " next_session_on, cadence, started_on, archived, owner_user_id)"
            + " VALUES (:id, :name, :description, :setting, :status, :notes,"
            + " :next_session_on, :cadence, :started_on, :archived, :owner_user_id)",
        paramsFor(c));
    return findById(c.getId()).orElse(c);
  }

  public Campaign update(String id, Campaign c) {
    int rows = jdbc.update(
        "UPDATE campaigns SET name=:name, description=:description,"
            + " setting=:setting, status=:status, notes=:notes,"
            + " next_session_on=:next_session_on, cadence=:cadence,"
            + " started_on=:started_on, archived=:archived,"
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
        .addValue("next_session_on",
            c.getNext_session_on() == null ? null : Date.valueOf(c.getNext_session_on()))
        .addValue("cadence", c.getCadence() == null ? "" : c.getCadence())
        .addValue("started_on",
            c.getStarted_on() == null ? null : Date.valueOf(c.getStarted_on()))
        .addValue("archived", c.getArchived() != null && c.getArchived())
        .addValue("owner_user_id", c.getOwner_user_id(), Types.OTHER);
  }
}
