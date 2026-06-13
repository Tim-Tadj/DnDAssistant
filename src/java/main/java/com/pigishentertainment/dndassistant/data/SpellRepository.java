package com.pigishentertainment.dndassistant.data;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pigishentertainment.dndassistant.domain.Spell;
import com.pigishentertainment.dndassistant.domain.SpellComponent;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.sql.Types;
import java.util.List;
import java.util.Optional;

@Repository
public class SpellRepository {

  private final JdbcTemplate jdbc;
  private final ObjectMapper mapper;
  private final RowMapper<Spell> spellRowMapper;

  public SpellRepository(JdbcTemplate jdbc, ObjectMapper mapper) {
    this.jdbc = jdbc;
    this.mapper = mapper;
    this.spellRowMapper = (rs, rowNum) -> mapRow(rs);
  }

  private Spell mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
    Spell s = new Spell();
    s.setId(rs.getLong("id"));
    s.setName(rs.getString("name"));
    s.setLevel(rs.getString("level"));
    s.setSchool(rs.getString("school"));
    s.setType(rs.getString("type"));
    s.setCasting_time(rs.getString("casting_time"));
    s.setRange(rs.getString("spell_range"));
    s.setDuration(rs.getString("duration"));
    s.setRitual(rs.getBoolean("ritual"));
    s.setDescription(rs.getString("description"));
    s.setHigher_levels(rs.getString("higher_levels"));
    String classes = rs.getString("classes");
    s.setClasses(classes == null || classes.isEmpty() ? new java.util.ArrayList<>() : splitCsv(classes));
    String tags = rs.getString("tags");
    s.setTags(tags == null || tags.isEmpty() ? new java.util.ArrayList<>() : splitCsv(tags));
    String componentsJson = rs.getString("components");
    s.setComponents(parseComponents(componentsJson));
    s.setProvenance(rs.getString("provenance"));
    s.setOwner_user_id(rs.getString("owner_user_id"));
    Timestamp created = rs.getTimestamp("created_at");
    if (created != null) s.setCreated_at(created.toInstant());
    Timestamp updated = rs.getTimestamp("updated_at");
    if (updated != null) s.setUpdated_at(updated.toInstant());
    return s;
  }

  public List<Spell> findAll() {
    return jdbc.query(
        "SELECT * FROM spells ORDER BY level, name",
        spellRowMapper);
  }

  public Optional<Spell> findById(long id) {
    List<Spell> rows = jdbc.query(
        "SELECT * FROM spells WHERE id = ?",
        spellRowMapper, id);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public Optional<Spell> findByNameAndProvenance(String name, String provenance) {
    List<Spell> rows = jdbc.query(
        "SELECT * FROM spells WHERE name = ? AND provenance = ?",
        spellRowMapper, name, provenance);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public int count() {
    Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM spells", Integer.class);
    return n == null ? 0 : n;
  }

  public Spell insert(Spell s) {
    if (s.getProvenance() == null || s.getProvenance().isEmpty()) {
      s.setProvenance("homebrew");
    }
    String componentsJson = serializeComponents(s.getComponents());
    String classesCsv = String.join(",", s.getClasses());
    String tagsCsv = String.join(",", s.getTags());
    String owner = s.getOwner_user_id();
    KeyHolder kh = new GeneratedKeyHolder();
    try {
      jdbc.update(con -> {
        PreparedStatement ps = con.prepareStatement(
            "INSERT INTO spells (name, level, school, type, casting_time, spell_range,"
                + " duration, ritual, description, higher_levels, classes, tags,"
                + " components, provenance, owner_user_id)"
                + " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?::jsonb,?,?)",
            new String[] {"id"});
        ps.setString(1, s.getName());
        ps.setString(2, s.getLevel());
        ps.setString(3, s.getSchool());
        ps.setString(4, s.getType());
        ps.setString(5, s.getCasting_time());
        ps.setString(6, s.getRange());
        ps.setString(7, s.getDuration());
        ps.setBoolean(8, s.isRitual());
        ps.setString(9, s.getDescription() == null ? "" : s.getDescription());
        ps.setString(10, s.getHigher_levels() == null ? "" : s.getHigher_levels());
        ps.setString(11, classesCsv);
        ps.setString(12, tagsCsv);
        ps.setString(13, componentsJson);
        ps.setString(14, s.getProvenance());
        if (owner == null) {
          ps.setNull(15, Types.VARCHAR);
        } else {
          ps.setString(15, owner);
        }
        return ps;
      }, kh);
    } catch (DuplicateKeyException e) {
      throw new IllegalStateException("A spell named '" + s.getName()
          + "' with provenance '" + s.getProvenance() + "' already exists", e);
    }
    Number key = kh.getKey();
    if (key != null) {
      s.setId(key.longValue());
    }
    return findById(s.getId()).orElse(s);
  }

  public int deleteAll() {
    return jdbc.update("DELETE FROM spells");
  }

  private SpellComponent parseComponents(String json) {
    if (json == null || json.isEmpty()) {
      return new SpellComponent();
    }
    try {
      return mapper.readValue(json, SpellComponent.class);
    } catch (JsonProcessingException e) {
      SpellComponent c = new SpellComponent();
      c.setRaw(json);
      return c;
    }
  }

  private String serializeComponents(SpellComponent c) {
    if (c == null) {
      return "{}";
    }
    try {
      return mapper.writeValueAsString(c);
    } catch (JsonProcessingException e) {
      return "{}";
    }
  }

  private static java.util.List<String> splitCsv(String csv) {
    java.util.List<String> out = new java.util.ArrayList<>();
    for (String p : csv.split(",")) {
      String t = p.trim();
      if (!t.isEmpty()) out.add(t);
    }
    return out;
  }
}
