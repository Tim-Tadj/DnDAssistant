package com.pigishentertainment.dndassistant.data;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pigishentertainment.dndassistant.domain.CampaignSession;
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
public class CampaignSessionRepository {

  private final NamedParameterJdbcTemplate jdbc;
  private final ObjectMapper json = new ObjectMapper();

  public CampaignSessionRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  private final RowMapper<CampaignSession> rowMapper = (rs, rowNum) -> {
    CampaignSession s = new CampaignSession();
    s.setId(rs.getString("id"));
    s.setCampaign_id(rs.getString("campaign_id"));
    int sn = rs.getInt("session_number");
    s.setSession_number(rs.wasNull() ? null : sn);
    s.setTitle(rs.getString("title"));
    Date played = rs.getDate("played_on");
    if (played != null) s.setPlayed_on(played.toLocalDate());
    s.setSummary(rs.getString("summary"));
    s.setPrep_notes(rs.getString("prep_notes"));
    String attendeesJson = rs.getString("attendees");
    if (attendeesJson != null && !attendeesJson.isBlank()) {
      try {
        s.setAttendees(json.readValue(attendeesJson, new TypeReference<List<String>>() {}));
      } catch (Exception e) {
        s.setAttendees(List.of());
      }
    }
    Timestamp created = rs.getTimestamp("created_at");
    if (created != null) s.setCreated_at(created.toInstant());
    Timestamp updated = rs.getTimestamp("updated_at");
    if (updated != null) s.setUpdated_at(updated.toInstant());
    return s;
  };

  public List<CampaignSession> findByCampaign(String campaignId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("cid", campaignId, Types.OTHER);
    return jdbc.query(
        "SELECT * FROM campaign_sessions WHERE campaign_id = :cid"
            + " ORDER BY session_number DESC, played_on DESC NULLS LAST",
        p, rowMapper);
  }

  public Optional<CampaignSession> findById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    List<CampaignSession> rows = jdbc.query(
        "SELECT * FROM campaign_sessions WHERE id = :id",
        p, rowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public int nextSessionNumber(String campaignId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("cid", campaignId, Types.OTHER);
    Integer n = jdbc.queryForObject(
        "SELECT COALESCE(MAX(session_number), 0) + 1 FROM campaign_sessions WHERE campaign_id = :cid",
        p, Integer.class);
    return n == null ? 1 : n;
  }

  public CampaignSession insert(CampaignSession s) {
    if (s.getSession_number() == null) {
      s.setSession_number(nextSessionNumber(s.getCampaign_id()));
    }
    MapSqlParameterSource p = paramsFor(s);
    jdbc.update(
        "INSERT INTO campaign_sessions (id, campaign_id, session_number, title,"
            + " played_on, summary, prep_notes, attendees)"
            + " VALUES (:id, :campaign_id, :session_number, :title,"
            + " :played_on, :summary, :prep_notes, :attendees)",
        p);
    return findById(s.getId()).orElse(s);
  }

  public CampaignSession update(String id, CampaignSession s) {
    MapSqlParameterSource p = paramsFor(s).addValue("id", id, Types.OTHER);
    int rows = jdbc.update(
        "UPDATE campaign_sessions SET session_number=:session_number, title=:title,"
            + " played_on=:played_on, summary=:summary, prep_notes=:prep_notes,"
            + " attendees=:attendees, updated_at=NOW()"
            + " WHERE id=:id",
        p);
    if (rows == 0) {
      throw new NoSuchElementException("Session " + id + " not found");
    }
    return findById(id).orElseThrow(() -> new NoSuchElementException("Session " + id + " not found"));
  }

  public void deleteById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    int rows = jdbc.update("DELETE FROM campaign_sessions WHERE id = :id", p);
    if (rows == 0) {
      throw new NoSuchElementException("Session " + id + " not found");
    }
  }

  private MapSqlParameterSource paramsFor(CampaignSession s) {
    String attendeesJson;
    try {
      attendeesJson = json.writeValueAsString(s.getAttendees() == null ? List.of() : s.getAttendees());
    } catch (Exception e) {
      attendeesJson = "[]";
    }
    return new MapSqlParameterSource()
        .addValue("id", s.getId(), Types.OTHER)
        .addValue("campaign_id", s.getCampaign_id(), Types.OTHER)
        .addValue("session_number", s.getSession_number() == null ? 1 : s.getSession_number())
        .addValue("title", s.getTitle() == null ? "" : s.getTitle())
        .addValue("played_on", s.getPlayed_on() == null ? null : Date.valueOf(s.getPlayed_on()))
        .addValue("summary", s.getSummary() == null ? "" : s.getSummary())
        .addValue("prep_notes", s.getPrep_notes() == null ? "" : s.getPrep_notes())
        .addValue("attendees", attendeesJson);
  }
}
