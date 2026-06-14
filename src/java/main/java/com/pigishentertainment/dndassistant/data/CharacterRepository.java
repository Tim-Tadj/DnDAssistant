package com.pigishentertainment.dndassistant.data;

import com.pigishentertainment.dndassistant.domain.Character;
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
public class CharacterRepository {

  private final NamedParameterJdbcTemplate jdbc;
  private final RowMapper<Character> rowMapper = (rs, rowNum) -> {
    Character c = new Character();
    c.setId(rs.getString("id"));
    c.setName(rs.getString("name"));
    c.setRaceId(rs.getLong("race_id"));
    c.setClassId(rs.getLong("class_id"));
    c.setLevel(rs.getInt("level"));
    c.setAlignment(rs.getString("alignment"));
    c.setBackground(rs.getString("background"));
    c.setStr(rs.getInt("str"));
    c.setDex(rs.getInt("dex"));
    c.setCon(rs.getInt("con"));
    c.setInt(rs.getInt("int_"));
    c.setWis(rs.getInt("wis"));
    c.setCha(rs.getInt("cha"));
    c.setHpMax(rs.getInt("hp_max"));
    c.setAc(rs.getInt("ac"));
    c.setNotes(rs.getString("notes"));
    c.setOwner_user_id(rs.getString("owner_user_id"));
    Timestamp created = rs.getTimestamp("created_at");
    if (created != null) c.setCreated_at(created.toInstant());
    Timestamp updated = rs.getTimestamp("updated_at");
    if (updated != null) c.setUpdated_at(updated.toInstant());
    return c;
  };

  public CharacterRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Character> findByOwner(String ownerUserId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("owner", ownerUserId, Types.OTHER);
    return jdbc.query(
        "SELECT * FROM characters WHERE owner_user_id = :owner ORDER BY name",
        p, rowMapper);
  }

  public Optional<Character> findById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    List<Character> rows = jdbc.query(
        "SELECT * FROM characters WHERE id = :id",
        p, rowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public Character insert(Character c) {
    jdbc.update(
        "INSERT INTO characters (id, name, race_id, class_id, level, alignment,"
            + " background, str, dex, con, int_, wis, cha, hp_max, ac, notes, owner_user_id)"
            + " VALUES (:id, :name, :race_id, :class_id, :level, :alignment,"
            + " :background, :str, :dex, :con, :int_, :wis, :cha, :hp_max, :ac,"
            + " :notes, :owner_user_id)",
        paramsFor(c));
    return findById(c.getId()).orElse(c);
  }

  public Character update(String id, Character c) {
    int rows = jdbc.update(
        "UPDATE characters SET name=:name, race_id=:race_id, class_id=:class_id,"
            + " level=:level, alignment=:alignment, background=:background,"
            + " str=:str, dex=:dex, con=:con, int_=:int_, wis=:wis, cha=:cha,"
            + " hp_max=:hp_max, ac=:ac, notes=:notes, updated_at=NOW()"
            + " WHERE id=:id",
        paramsFor(c).addValue("id", id, Types.OTHER));
    if (rows == 0) {
      throw new NoSuchElementException("Character " + id + " not found");
    }
    return findById(id).orElseThrow(() -> new NoSuchElementException("Character " + id + " not found"));
  }

  public void deleteById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    int rows = jdbc.update(
        "DELETE FROM characters WHERE id = :id",
        p);
    if (rows == 0) {
      throw new NoSuchElementException("Character " + id + " not found");
    }
  }

  private static MapSqlParameterSource paramsFor(Character c) {
    return new MapSqlParameterSource()
        .addValue("id", c.getId(), Types.OTHER)
        .addValue("name", c.getName())
        .addValue("race_id", c.getRaceId())
        .addValue("class_id", c.getClassId())
        .addValue("level", c.getLevel() == null ? 1 : c.getLevel())
        .addValue("alignment", c.getAlignment() == null ? "Neutral" : c.getAlignment())
        .addValue("background", c.getBackground() == null ? "" : c.getBackground())
        .addValue("str", c.getStr() == null ? 10 : c.getStr())
        .addValue("dex", c.getDex() == null ? 10 : c.getDex())
        .addValue("con", c.getCon() == null ? 10 : c.getCon())
        .addValue("int_", c.getInt() == null ? 10 : c.getInt())
        .addValue("wis", c.getWis() == null ? 10 : c.getWis())
        .addValue("cha", c.getCha() == null ? 10 : c.getCha())
        .addValue("hp_max", c.getHpMax() == null ? 10 : c.getHpMax())
        .addValue("ac", c.getAc() == null ? 10 : c.getAc())
        .addValue("notes", c.getNotes() == null ? "" : c.getNotes())
        .addValue("owner_user_id", c.getOwner_user_id(), Types.OTHER);
  }
}
