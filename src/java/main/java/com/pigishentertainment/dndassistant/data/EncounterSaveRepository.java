package com.pigishentertainment.dndassistant.data;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pigishentertainment.dndassistant.domain.EncounterSave;
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
public class EncounterSaveRepository {

  private final NamedParameterJdbcTemplate jdbc;
  private final ObjectMapper json = new ObjectMapper();

  public EncounterSaveRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  private final RowMapper<EncounterSave> rowMapper = (rs, rowNum) -> {
    EncounterSave e = new EncounterSave();
    e.setId(rs.getString("id"));
    e.setOwner_user_id(rs.getString("owner_user_id"));
    e.setCampaign_id(rs.getString("campaign_id"));
    e.setName(rs.getString("name"));
    try {
      String m = rs.getString("monsters_json");
      if (m != null && !m.isBlank()) {
        e.setMonsters(json.readValue(m, new TypeReference<List<EncounterSave.MonsterRef>>() {}));
      }
      String p = rs.getString("party_snapshot_json");
      if (p != null && !p.isBlank()) {
        e.setParty_snapshot_ids(json.readValue(p, new TypeReference<List<String>>() {}));
      }
    } catch (Exception ex) {
      // ignore parse errors; leave the lists as defaults
    }
    e.setDifficulty(rs.getString("difficulty"));
    int total = rs.getInt("total_xp");
    e.setTotal_xp(rs.wasNull() ? null : total);
    Date played = rs.getDate("played_on");
    if (played != null) e.setPlayed_on(played.toLocalDate());
    e.setNotes(rs.getString("notes"));
    Timestamp created = rs.getTimestamp("created_at");
    if (created != null) e.setCreated_at(created.toInstant());
    Timestamp updated = rs.getTimestamp("updated_at");
    if (updated != null) e.setUpdated_at(updated.toInstant());
    return e;
  };

  public List<EncounterSave> findByOwner(String ownerUserId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("owner", ownerUserId, Types.OTHER);
    return jdbc.query(
        "SELECT * FROM encounter_saves WHERE owner_user_id = :owner"
            + " ORDER BY played_on DESC NULLS LAST, updated_at DESC",
        p, rowMapper);
  }

  public List<EncounterSave> findByCampaign(String campaignId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("cid", campaignId, Types.OTHER);
    return jdbc.query(
        "SELECT * FROM encounter_saves WHERE campaign_id = :cid"
            + " ORDER BY played_on DESC NULLS LAST, updated_at DESC",
        p, rowMapper);
  }

  public Optional<EncounterSave> findById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    List<EncounterSave> rows = jdbc.query(
        "SELECT * FROM encounter_saves WHERE id = :id",
        p, rowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public EncounterSave insert(EncounterSave e) {
    MapSqlParameterSource p = paramsFor(e);
    jdbc.update(
        "INSERT INTO encounter_saves (id, owner_user_id, campaign_id, name,"
            + " monsters_json, party_snapshot_json, difficulty, total_xp,"
            + " played_on, notes)"
            + " VALUES (:id, :owner_user_id, :campaign_id, :name,"
            + " :monsters_json, :party_snapshot_json, :difficulty, :total_xp,"
            + " :played_on, :notes)",
        p);
    return findById(e.getId()).orElse(e);
  }

  public void deleteById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    int rows = jdbc.update("DELETE FROM encounter_saves WHERE id = :id", p);
    if (rows == 0) {
      throw new NoSuchElementException("Encounter save " + id + " not found");
    }
  }

  private MapSqlParameterSource paramsFor(EncounterSave e) {
    String monstersJson;
    String partyJson;
    try {
      monstersJson = json.writeValueAsString(e.getMonsters() == null ? List.of() : e.getMonsters());
      partyJson = json.writeValueAsString(e.getParty_snapshot_ids() == null ? List.of() : e.getParty_snapshot_ids());
    } catch (Exception ex) {
      monstersJson = "[]";
      partyJson = "[]";
    }
    return new MapSqlParameterSource()
        .addValue("id", e.getId(), Types.OTHER)
        .addValue("owner_user_id", e.getOwner_user_id(), Types.OTHER)
        .addValue("campaign_id", e.getCampaign_id(), Types.OTHER)
        .addValue("name", e.getName() == null ? "" : e.getName())
        .addValue("monsters_json", monstersJson)
        .addValue("party_snapshot_json", partyJson)
        .addValue("difficulty", e.getDifficulty() == null ? "" : e.getDifficulty())
        .addValue("total_xp", e.getTotal_xp() == null ? 0 : e.getTotal_xp())
        .addValue("played_on", e.getPlayed_on() == null ? null : Date.valueOf(e.getPlayed_on()))
        .addValue("notes", e.getNotes() == null ? "" : e.getNotes());
  }
}
