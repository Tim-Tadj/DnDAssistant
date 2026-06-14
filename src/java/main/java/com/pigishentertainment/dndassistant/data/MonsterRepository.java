package com.pigishentertainment.dndassistant.data;

import com.pigishentertainment.dndassistant.domain.Monster;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Repository
public class MonsterRepository {

  private static final String COLUMNS =
      "id, name, meta, ac, hp, speed,"
          + " str, str_mod, dex, dex_mod, con, con_mod,"
          + " int, int_mod, wis, wis_mod, cha, cha_mod,"
          + " saving_throws, skills,"
          + " damage_vulnerabilities, damage_resistances, damage_immunities,"
          + " condition_immunities, senses, languages, challenge,"
          + " traits, actions, reactions, legendary_actions,"
          + " description, lair_actions, regional_effects,"
          + " img_url, provenance, owner_user_id, created_at, updated_at";

  private static final String INSERT_SQL = "INSERT INTO monsters ("
      + "name, meta, ac, hp, speed,"
      + " str, str_mod, dex, dex_mod, con, con_mod,"
      + " int, int_mod, wis, wis_mod, cha, cha_mod,"
      + " saving_throws, skills,"
      + " damage_vulnerabilities, damage_resistances, damage_immunities,"
      + " condition_immunities, senses, languages, challenge,"
      + " traits, actions, reactions, legendary_actions,"
      + " description, lair_actions, regional_effects,"
      + " img_url, provenance, owner_user_id)"
      + " VALUES (:name, :meta, :ac, :hp, :speed,"
      + " :str, :str_mod, :dex, :dex_mod, :con, :con_mod,"
      + " :int, :int_mod, :wis, :wis_mod, :cha, :cha_mod,"
      + " :saving_throws, :skills,"
      + " :damage_vulnerabilities, :damage_resistances, :damage_immunities,"
      + " :condition_immunities, :senses, :languages, :challenge,"
      + " :traits, :actions, :reactions, :legendary_actions,"
      + " :description, :lair_actions, :regional_effects,"
      + " :img_url, :provenance, :owner_user_id)";

  private final NamedParameterJdbcTemplate jdbc;
  private final RowMapper<Monster> monsterRowMapper;

  public MonsterRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
    this.monsterRowMapper = (rs, rowNum) -> mapRow(rs);
  }

  private static Monster mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
    Monster m = new Monster();
    m.setId(rs.getLong("id"));
    m.setName(rs.getString("name"));
    m.setMeta(rs.getString("meta"));
    m.setAc(rs.getString("ac"));
    m.setHp(rs.getString("hp"));
    m.setSpeed(rs.getString("speed"));
    m.setStr(rs.getString("str"));
    m.setStr_mod(rs.getString("str_mod"));
    m.setDex(rs.getString("dex"));
    m.setDex_mod(rs.getString("dex_mod"));
    m.setCon(rs.getString("con"));
    m.setCon_mod(rs.getString("con_mod"));
    m.setInt_(rs.getString("int"));
    m.setInt_mod(rs.getString("int_mod"));
    m.setWis(rs.getString("wis"));
    m.setWis_mod(rs.getString("wis_mod"));
    m.setCha(rs.getString("cha"));
    m.setCha_mod(rs.getString("cha_mod"));
    m.setSaving_throws(rs.getString("saving_throws"));
    m.setSkills(rs.getString("skills"));
    m.setDamage_vulnerabilities(rs.getString("damage_vulnerabilities"));
    m.setDamage_resistances(rs.getString("damage_resistances"));
    m.setDamage_immunities(rs.getString("damage_immunities"));
    m.setCondition_immunities(rs.getString("condition_immunities"));
    m.setSenses(rs.getString("senses"));
    m.setLanguages(rs.getString("languages"));
    m.setChallenge(rs.getString("challenge"));
    m.setTraits(rs.getString("traits"));
    m.setActions(rs.getString("actions"));
    m.setReactions(rs.getString("reactions"));
    m.setLegendary_actions(rs.getString("legendary_actions"));
    m.setDescription(rs.getString("description"));
    m.setLair_actions(rs.getString("lair_actions"));
    m.setRegional_effects(rs.getString("regional_effects"));
    m.setImg_url(rs.getString("img_url"));
    m.setProvenance(rs.getString("provenance"));
    m.setOwner_user_id(rs.getString("owner_user_id"));
    Timestamp created = rs.getTimestamp("created_at");
    if (created != null) m.setCreated_at(created.toInstant());
    Timestamp updated = rs.getTimestamp("updated_at");
    if (updated != null) m.setUpdated_at(updated.toInstant());
    return m;
  }

  public List<Monster> findAll() {
    return jdbc.query("SELECT " + COLUMNS + " FROM monsters ORDER BY name", monsterRowMapper);
  }

  public Optional<Monster> findById(long id) {
    List<Monster> rows = jdbc.query(
        "SELECT " + COLUMNS + " FROM monsters WHERE id = :id",
        new MapSqlParameterSource("id", id),
        monsterRowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public int count() {
    Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM monsters",
        new MapSqlParameterSource(), Integer.class);
    return n == null ? 0 : n;
  }

  public Monster insert(Monster m) {
    if (m.getProvenance() == null || m.getProvenance().isEmpty()) {
      m.setProvenance("homebrew");
    }
    KeyHolder kh = new GeneratedKeyHolder();
    try {
      jdbc.update(INSERT_SQL, paramsFor(m), kh, new String[] {"id"});
    } catch (DuplicateKeyException e) {
      throw new IllegalStateException("A monster named '" + m.getName()
          + "' with provenance '" + m.getProvenance() + "' already exists", e);
    }
    Number key = kh.getKey();
    if (key != null) {
      m.setId(key.longValue());
    }
    return findById(m.getId()).orElse(m);
  }

  private static MapSqlParameterSource paramsFor(Monster m) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("name", m.getName());
    p.addValue("meta", nullToEmpty(m.getMeta()));
    p.addValue("ac", nullToEmpty(m.getAc()));
    p.addValue("hp", nullToEmpty(m.getHp()));
    p.addValue("speed", nullToEmpty(m.getSpeed()));
    p.addValue("str", nullToEmpty(m.getStr()));
    p.addValue("str_mod", nullToEmpty(m.getStr_mod()));
    p.addValue("dex", nullToEmpty(m.getDex()));
    p.addValue("dex_mod", nullToEmpty(m.getDex_mod()));
    p.addValue("con", nullToEmpty(m.getCon()));
    p.addValue("con_mod", nullToEmpty(m.getCon_mod()));
    p.addValue("int", nullToEmpty(m.getInt_()));
    p.addValue("int_mod", nullToEmpty(m.getInt_mod()));
    p.addValue("wis", nullToEmpty(m.getWis()));
    p.addValue("wis_mod", nullToEmpty(m.getWis_mod()));
    p.addValue("cha", nullToEmpty(m.getCha()));
    p.addValue("cha_mod", nullToEmpty(m.getCha_mod()));
    p.addValue("saving_throws", nullToEmpty(m.getSaving_throws()));
    p.addValue("skills", nullToEmpty(m.getSkills()));
    p.addValue("damage_vulnerabilities", nullToEmpty(m.getDamage_vulnerabilities()));
    p.addValue("damage_resistances", nullToEmpty(m.getDamage_resistances()));
    p.addValue("damage_immunities", nullToEmpty(m.getDamage_immunities()));
    p.addValue("condition_immunities", nullToEmpty(m.getCondition_immunities()));
    p.addValue("senses", nullToEmpty(m.getSenses()));
    p.addValue("languages", nullToEmpty(m.getLanguages()));
    p.addValue("challenge", nullToEmpty(m.getChallenge()));
    p.addValue("traits", nullToEmpty(m.getTraits()));
    p.addValue("actions", nullToEmpty(m.getActions()));
    p.addValue("reactions", nullToEmpty(m.getReactions()));
    p.addValue("legendary_actions", nullToEmpty(m.getLegendary_actions()));
    p.addValue("description", nullToEmpty(m.getDescription()));
    p.addValue("lair_actions", nullToEmpty(m.getLair_actions()));
    p.addValue("regional_effects", nullToEmpty(m.getRegional_effects()));
    p.addValue("img_url", nullToEmpty(m.getImg_url()));
    p.addValue("provenance", m.getProvenance());
    p.addValue("owner_user_id", m.getOwner_user_id());
    return p;
  }

  private static String nullToEmpty(String s) {
    return s == null ? "" : s;
  }

  public Monster update(long id, Monster body) {
    if (body == null || body.getName() == null || body.getName().isBlank()) {
      throw new IllegalArgumentException("Monster 'name' is required");
    }
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id);
    p.addValue("name", body.getName());
    p.addValue("meta", nullToEmpty(body.getMeta()));
    p.addValue("ac", nullToEmpty(body.getAc()));
    p.addValue("hp", nullToEmpty(body.getHp()));
    p.addValue("speed", nullToEmpty(body.getSpeed()));
    p.addValue("str", nullToEmpty(body.getStr()));
    p.addValue("str_mod", nullToEmpty(body.getStr_mod()));
    p.addValue("dex", nullToEmpty(body.getDex()));
    p.addValue("dex_mod", nullToEmpty(body.getDex_mod()));
    p.addValue("con", nullToEmpty(body.getCon()));
    p.addValue("con_mod", nullToEmpty(body.getCon_mod()));
    p.addValue("int", nullToEmpty(body.getInt_()));
    p.addValue("int_mod", nullToEmpty(body.getInt_mod()));
    p.addValue("wis", nullToEmpty(body.getWis()));
    p.addValue("wis_mod", nullToEmpty(body.getWis_mod()));
    p.addValue("cha", nullToEmpty(body.getCha()));
    p.addValue("cha_mod", nullToEmpty(body.getCha_mod()));
    p.addValue("saving_throws", nullToEmpty(body.getSaving_throws()));
    p.addValue("skills", nullToEmpty(body.getSkills()));
    p.addValue("damage_vulnerabilities", nullToEmpty(body.getDamage_vulnerabilities()));
    p.addValue("damage_resistances", nullToEmpty(body.getDamage_resistances()));
    p.addValue("damage_immunities", nullToEmpty(body.getDamage_immunities()));
    p.addValue("condition_immunities", nullToEmpty(body.getCondition_immunities()));
    p.addValue("senses", nullToEmpty(body.getSenses()));
    p.addValue("languages", nullToEmpty(body.getLanguages()));
    p.addValue("challenge", nullToEmpty(body.getChallenge()));
    p.addValue("traits", nullToEmpty(body.getTraits()));
    p.addValue("actions", nullToEmpty(body.getActions()));
    p.addValue("reactions", nullToEmpty(body.getReactions()));
    p.addValue("legendary_actions", nullToEmpty(body.getLegendary_actions()));
    p.addValue("description", nullToEmpty(body.getDescription()));
    p.addValue("lair_actions", nullToEmpty(body.getLair_actions()));
    p.addValue("regional_effects", nullToEmpty(body.getRegional_effects()));
    p.addValue("img_url", nullToEmpty(body.getImg_url()));
    int rows = jdbc.update(
        "UPDATE monsters SET"
            + " name=:name, meta=:meta, ac=:ac, hp=:hp, speed=:speed,"
            + " str=:str, str_mod=:str_mod, dex=:dex, dex_mod=:dex_mod,"
            + " con=:con, con_mod=:con_mod, int=:int, int_mod=:int_mod,"
            + " wis=:wis, wis_mod=:wis_mod, cha=:cha, cha_mod=:cha_mod,"
            + " saving_throws=:saving_throws, skills=:skills,"
            + " damage_vulnerabilities=:damage_vulnerabilities,"
            + " damage_resistances=:damage_resistances,"
            + " damage_immunities=:damage_immunities,"
            + " condition_immunities=:condition_immunities,"
            + " senses=:senses, languages=:languages, challenge=:challenge,"
            + " traits=:traits, actions=:actions, reactions=:reactions,"
            + " legendary_actions=:legendary_actions, description=:description,"
            + " lair_actions=:lair_actions, regional_effects=:regional_effects,"
            + " img_url=:img_url, updated_at=NOW()"
            + " WHERE id=:id",
        p);
    if (rows == 0) {
      throw new NoSuchElementException("Monster " + id + " not found");
    }
    return findById(id).orElseThrow(() -> new NoSuchElementException("Monster " + id + " not found"));
  }

  public void deleteById(long id) {
    int rows = jdbc.update("DELETE FROM monsters WHERE id = :id",
        new MapSqlParameterSource("id", id));
    if (rows == 0) {
      throw new NoSuchElementException("Monster " + id + " not found");
    }
  }

  public Optional<Monster> findByNaturalKey(String name, String provenance, String ownerUserId) {
    String sql = "SELECT " + COLUMNS + " FROM monsters"
        + " WHERE name = :name AND provenance = :provenance"
        + " AND owner_user_id IS NOT DISTINCT FROM :owner";
    MapSqlParameterSource p = new MapSqlParameterSource()
        .addValue("name", name)
        .addValue("provenance", provenance)
        .addValue("owner", ownerUserId);
    List<Monster> rows = jdbc.query(sql, p, monsterRowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public UpsertResult upsert(Monster m) {
    if (m.getProvenance() == null || m.getProvenance().isEmpty()) {
      m.setProvenance("homebrew");
    }
    Optional<Monster> existing = findByNaturalKey(
        m.getName(), m.getProvenance(), m.getOwner_user_id());
    if (existing.isPresent()) {
      Monster e = existing.get();
      m.setId(e.getId());
      Monster updated = update(e.getId(), m);
      return new UpsertResult(updated, false);
    } else {
      return new UpsertResult(insert(m), true);
    }
  }

  public static final class UpsertResult {
    private final Monster monster;
    private final boolean created;
    public UpsertResult(Monster monster, boolean created) {
      this.monster = monster;
      this.created = created;
    }
    public Monster getMonster() { return monster; }
    public boolean isCreated() { return created; }
  }
}
