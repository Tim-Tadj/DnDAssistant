package com.pigishentertainment.dndassistant.data;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pigishentertainment.dndassistant.domain.CampaignCharacter;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

@Repository
public class CampaignCharacterRepository {

  private final NamedParameterJdbcTemplate jdbc;
  private final ObjectMapper json = new ObjectMapper();

  public CampaignCharacterRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  private final RowMapper<CampaignCharacter> rowMapper = (rs, rowNum) -> {
    CampaignCharacter c = new CampaignCharacter();
    c.setId(rs.getString("id"));
    c.setCampaign_id(rs.getString("campaign_id"));
    c.setCharacter_id(rs.getString("character_id"));
    c.setLevel(rs.getInt("level"));
    int hpOvr = rs.getInt("hp_max_override");
    c.setHp_max_override(rs.wasNull() ? null : hpOvr);
    int acOvr = rs.getInt("ac_override");
    c.setAc_override(rs.wasNull() ? null : acOvr);
    c.setNotes(rs.getString("notes"));
    String conds = rs.getString("conditions");
    if (conds != null && !conds.isBlank()) {
      try {
        c.setConditions(json.readValue(conds, new TypeReference<List<String>>() {}));
      } catch (Exception e) {
        c.setConditions(List.of());
      }
    }
    c.setDeath_save_successes(rs.getInt("death_save_successes"));
    c.setDeath_save_failures(rs.getInt("death_save_failures"));
    c.setHit_dice_used(rs.getInt("hit_dice_used"));
    Timestamp llr = rs.getTimestamp("last_long_rest");
    if (llr != null) c.setLast_long_rest(llr.toInstant());
    Timestamp lsr = rs.getTimestamp("last_short_rest");
    if (lsr != null) c.setLast_short_rest(lsr.toInstant());
    Timestamp created = rs.getTimestamp("created_at");
    if (created != null) c.setCreated_at(created.toInstant());
    Timestamp updated = rs.getTimestamp("updated_at");
    if (updated != null) c.setUpdated_at(updated.toInstant());
    return c;
  };

  public List<CampaignCharacter> findByCampaignId(String campaignId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("cid", campaignId, Types.OTHER);
    return jdbc.query(
        "SELECT * FROM campaign_characters WHERE campaign_id = :cid"
            + " ORDER BY created_at ASC",
        p, rowMapper);
  }

  public Optional<CampaignCharacter> findByCampaignAndCharacter(String campaignId, String characterId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("cid", campaignId, Types.OTHER);
    p.addValue("chid", characterId, Types.OTHER);
    List<CampaignCharacter> rows = jdbc.query(
        "SELECT * FROM campaign_characters WHERE campaign_id = :cid AND character_id = :chid",
        p, rowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  /**
   * Get-or-create a CampaignCharacter row, defaulting to the
   * character's current level / hp_max from the canonical row. Used
   * when the DM opens a character's per-campaign panel for the first
   * time.
   */
  public CampaignCharacter getOrInit(String campaignId, String characterId, int defaultLevel, int defaultHpMax) {
    Optional<CampaignCharacter> existing = findByCampaignAndCharacter(campaignId, characterId);
    if (existing.isPresent()) return existing.get();
    CampaignCharacter c = new CampaignCharacter();
    c.setId(UUID.randomUUID().toString());
    c.setCampaign_id(campaignId);
    c.setCharacter_id(characterId);
    c.setLevel(defaultLevel);
    c.setHp_max_override(defaultHpMax);
    c.setAc_override(null);
    c.setNotes("");
    c.setConditions(List.of());
    c.setDeath_save_successes(0);
    c.setDeath_save_failures(0);
    c.setHit_dice_used(0);
    return insert(c);
  }

  public CampaignCharacter insert(CampaignCharacter c) {
    if (c.getId() == null || c.getId().isBlank()) c.setId(UUID.randomUUID().toString());
    String condsJson;
    try {
      condsJson = json.writeValueAsString(c.getConditions() == null ? List.of() : c.getConditions());
    } catch (Exception e) {
      condsJson = "[]";
    }
    MapSqlParameterSource p = new MapSqlParameterSource()
        .addValue("id", c.getId(), Types.OTHER)
        .addValue("cid", c.getCampaign_id(), Types.OTHER)
        .addValue("chid", c.getCharacter_id(), Types.OTHER)
        .addValue("level", c.getLevel() == null ? 1 : c.getLevel())
        .addValue("hp_max_override", c.getHp_max_override(), Types.INTEGER)
        .addValue("ac_override", c.getAc_override(), Types.INTEGER)
        .addValue("notes", c.getNotes() == null ? "" : c.getNotes())
        .addValue("conditions", condsJson)
        .addValue("death_save_successes", c.getDeath_save_successes() == null ? 0 : c.getDeath_save_successes())
        .addValue("death_save_failures", c.getDeath_save_failures() == null ? 0 : c.getDeath_save_failures())
        .addValue("hit_dice_used", c.getHit_dice_used() == null ? 0 : c.getHit_dice_used())
        .addValue("last_long_rest", c.getLast_long_rest() == null ? null : Timestamp.from(c.getLast_long_rest()))
        .addValue("last_short_rest", c.getLast_short_rest() == null ? null : Timestamp.from(c.getLast_short_rest()));
    jdbc.update(
        "INSERT INTO campaign_characters (id, campaign_id, character_id, level,"
            + " hp_max_override, ac_override, notes, conditions,"
            + " death_save_successes, death_save_failures, hit_dice_used,"
            + " last_long_rest, last_short_rest, created_at, updated_at)"
            + " VALUES (:id, :cid, :chid, :level, :hp_max_override, :ac_override,"
            + " :notes, :conditions, :death_save_successes, :death_save_failures,"
            + " :hit_dice_used, :last_long_rest, :last_short_rest, NOW(), NOW())",
        p);
    return findByCampaignAndCharacter(c.getCampaign_id(), c.getCharacter_id())
        .orElseThrow(() -> new NoSuchElementException("Failed to insert campaign_character"));
  }

  public CampaignCharacter upsert(CampaignCharacter c) {
    if (c.getId() == null || c.getId().isBlank()) {
      // No id provided: this is a fresh insert
      return insert(c);
    }
    String condsJson;
    try {
      condsJson = json.writeValueAsString(c.getConditions() == null ? List.of() : c.getConditions());
    } catch (Exception e) {
      condsJson = "[]";
    }
    MapSqlParameterSource p = new MapSqlParameterSource()
        .addValue("id", c.getId(), Types.OTHER)
        .addValue("cid", c.getCampaign_id(), Types.OTHER)
        .addValue("chid", c.getCharacter_id(), Types.OTHER)
        .addValue("level", c.getLevel() == null ? 1 : c.getLevel())
        .addValue("hp_max_override", c.getHp_max_override(), Types.INTEGER)
        .addValue("ac_override", c.getAc_override(), Types.INTEGER)
        .addValue("notes", c.getNotes() == null ? "" : c.getNotes())
        .addValue("conditions", condsJson)
        .addValue("death_save_successes", c.getDeath_save_successes() == null ? 0 : c.getDeath_save_successes())
        .addValue("death_save_failures", c.getDeath_save_failures() == null ? 0 : c.getDeath_save_failures())
        .addValue("hit_dice_used", c.getHit_dice_used() == null ? 0 : c.getHit_dice_used())
        .addValue("last_long_rest", c.getLast_long_rest() == null ? null : Timestamp.from(c.getLast_long_rest()))
        .addValue("last_short_rest", c.getLast_short_rest() == null ? null : Timestamp.from(c.getLast_short_rest()));
    int updated = jdbc.update(
        "UPDATE campaign_characters SET"
            + " level = :level,"
            + " hp_max_override = :hp_max_override,"
            + " ac_override = :ac_override,"
            + " notes = :notes,"
            + " conditions = :conditions,"
            + " death_save_successes = :death_save_successes,"
            + " death_save_failures = :death_save_failures,"
            + " hit_dice_used = :hit_dice_used,"
            + " last_long_rest = :last_long_rest,"
            + " last_short_rest = :last_short_rest,"
            + " updated_at = NOW()"
            + " WHERE id = :id",
        p);
    if (updated == 0) {
      return insert(c);
    }
    return findByCampaignAndCharacter(c.getCampaign_id(), c.getCharacter_id()).orElse(c);
  }

  public void deleteById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    jdbc.update("DELETE FROM campaign_characters WHERE id = :id", p);
  }

  public void deleteByCampaignAndCharacter(String campaignId, String characterId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("cid", campaignId, Types.OTHER);
    p.addValue("chid", characterId, Types.OTHER);
    jdbc.update("DELETE FROM campaign_characters WHERE campaign_id = :cid AND character_id = :chid", p);
  }
}
