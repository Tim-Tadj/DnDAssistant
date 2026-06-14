package com.pigishentertainment.dndassistant.data;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pigishentertainment.dndassistant.domain.Character;
import com.pigishentertainment.dndassistant.domain.CharacterState;
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
public class CharacterStateRepository {

  private final NamedParameterJdbcTemplate jdbc;
  private final CharacterRepository characters;
  private final ObjectMapper json = new ObjectMapper();

  public CharacterStateRepository(NamedParameterJdbcTemplate jdbc, CharacterRepository characters) {
    this.jdbc = jdbc;
    this.characters = characters;
  }

  private final RowMapper<CharacterState> rowMapper = (rs, rowNum) -> {
    CharacterState s = new CharacterState();
    s.setCharacter_id(rs.getString("character_id"));
    s.setCurrent_hp(rs.getInt("current_hp"));
    s.setTemp_hp(rs.getInt("temp_hp"));
    String conds = rs.getString("conditions");
    if (conds != null && !conds.isBlank()) {
      try {
        s.setConditions(json.readValue(conds, new TypeReference<List<String>>() {}));
      } catch (Exception e) {
        s.setConditions(List.of());
      }
    }
    s.setDeath_save_successes(rs.getInt("death_save_successes"));
    s.setDeath_save_failures(rs.getInt("death_save_failures"));
    s.setHit_dice_used(rs.getInt("hit_dice_used"));
    Timestamp llr = rs.getTimestamp("last_long_rest");
    if (llr != null) s.setLast_long_rest(llr.toInstant());
    Timestamp lsr = rs.getTimestamp("last_short_rest");
    if (lsr != null) s.setLast_short_rest(lsr.toInstant());
    Timestamp updated = rs.getTimestamp("updated_at");
    if (updated != null) s.setUpdated_at(updated.toInstant());
    return s;
  };

  public Optional<CharacterState> findByCharacterId(String characterId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("cid", characterId, Types.OTHER);
    List<CharacterState> rows = jdbc.query(
        "SELECT * FROM character_state WHERE character_id = :cid",
        p, rowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  /**
   * Get the state for a character, creating it (with current_hp = hp_max
   * from the character stat block) if it doesn't exist yet. Returns a
   * fresh, never-persisted state to the caller.
   */
  public CharacterState getOrInit(String characterId) {
    Optional<CharacterState> existing = findByCharacterId(characterId);
    if (existing.isPresent()) return existing.get();
    Character c = characters.findById(characterId)
        .orElseThrow(() -> new NoSuchElementException("Character " + characterId + " not found"));
    CharacterState s = new CharacterState();
    s.setCharacter_id(characterId);
    s.setCurrent_hp(c.getHpMax() == null ? 10 : c.getHpMax());
    s.setTemp_hp(0);
    s.setConditions(List.of());
    s.setDeath_save_successes(0);
    s.setDeath_save_failures(0);
    s.setHit_dice_used(0);
    return s;
  }

  public CharacterState upsert(CharacterState s) {
    String condsJson;
    try {
      condsJson = json.writeValueAsString(s.getConditions() == null ? List.of() : s.getConditions());
    } catch (Exception e) {
      condsJson = "[]";
    }
    MapSqlParameterSource p = new MapSqlParameterSource()
        .addValue("cid", s.getCharacter_id(), Types.OTHER)
        .addValue("current_hp", s.getCurrent_hp() == null ? 0 : s.getCurrent_hp())
        .addValue("temp_hp", s.getTemp_hp() == null ? 0 : s.getTemp_hp())
        .addValue("conditions", condsJson)
        .addValue("death_save_successes", s.getDeath_save_successes() == null ? 0 : s.getDeath_save_successes())
        .addValue("death_save_failures", s.getDeath_save_failures() == null ? 0 : s.getDeath_save_failures())
        .addValue("hit_dice_used", s.getHit_dice_used() == null ? 0 : s.getHit_dice_used())
        .addValue("last_long_rest", s.getLast_long_rest() == null ? null : Timestamp.from(s.getLast_long_rest()))
        .addValue("last_short_rest", s.getLast_short_rest() == null ? null : Timestamp.from(s.getLast_short_rest()));
    jdbc.update(
        "INSERT INTO character_state (character_id, current_hp, temp_hp, conditions,"
            + " death_save_successes, death_save_failures, hit_dice_used,"
            + " last_long_rest, last_short_rest, updated_at)"
            + " VALUES (:cid, :current_hp, :temp_hp, :conditions, :death_save_successes,"
            + " :death_save_failures, :hit_dice_used, :last_long_rest, :last_short_rest, NOW())"
            + " ON CONFLICT (character_id) DO UPDATE SET"
            + " current_hp = EXCLUDED.current_hp, temp_hp = EXCLUDED.temp_hp,"
            + " conditions = EXCLUDED.conditions,"
            + " death_save_successes = EXCLUDED.death_save_successes,"
            + " death_save_failures = EXCLUDED.death_save_failures,"
            + " hit_dice_used = EXCLUDED.hit_dice_used,"
            + " last_long_rest = EXCLUDED.last_long_rest,"
            + " last_short_rest = EXCLUDED.last_short_rest,"
            + " updated_at = NOW()",
        p);
    return findByCharacterId(s.getCharacter_id()).orElse(s);
  }
}
