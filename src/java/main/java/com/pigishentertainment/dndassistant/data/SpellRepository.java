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
import java.util.NoSuchElementException;
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

  /**
   * Lookup by the natural key (name, provenance, owner_user_id). The
   * owner_user_id is nullable; the SQL uses IS NOT DISTINCT FROM so
   * NULLs compare equal (per the spec's idempotency rule).
   */
  public Optional<Spell> findByNaturalKey(String name, String provenance, String ownerUserId) {
    String sql = "SELECT * FROM spells WHERE name = ? AND provenance = ?"
        + " AND owner_user_id IS NOT DISTINCT FROM ?";
    List<Spell> rows = jdbc.query(sql, spellRowMapper, name, provenance, ownerUserId);
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

  public Spell update(long id, Spell body) {
    if (body == null || body.getName() == null || body.getName().isBlank()) {
      throw new IllegalArgumentException("Spell 'name' is required");
    }
    if (body.getLevel() == null || body.getLevel().isBlank()) {
      throw new IllegalArgumentException("Spell 'level' is required");
    }
    if (body.getSchool() == null || body.getSchool().isBlank()) {
      throw new IllegalArgumentException("Spell 'school' is required");
    }
    String componentsJson = serializeComponents(body.getComponents());
    String classesCsv = String.join(",", body.getClasses());
    String tagsCsv = String.join(",", body.getTags());
    String owner = body.getOwner_user_id();
    int rows = jdbc.update(con -> {
      PreparedStatement ps = con.prepareStatement(
          "UPDATE spells SET name=?, level=?, school=?, type=?, casting_time=?,"
              + " spell_range=?, duration=?, ritual=?, description=?, higher_levels=?,"
              + " classes=?, tags=?, components=?::jsonb, updated_at=NOW()"
              + " WHERE id=?");
      ps.setString(1, body.getName());
      ps.setString(2, body.getLevel());
      ps.setString(3, body.getSchool());
      ps.setString(4, body.getType());
      ps.setString(5, body.getCasting_time());
      ps.setString(6, body.getRange());
      ps.setString(7, body.getDuration());
      ps.setBoolean(8, body.isRitual());
      ps.setString(9, body.getDescription() == null ? "" : body.getDescription());
      ps.setString(10, body.getHigher_levels() == null ? "" : body.getHigher_levels());
      ps.setString(11, classesCsv);
      ps.setString(12, tagsCsv);
      ps.setString(13, componentsJson);
      ps.setLong(14, id);
      return ps;
    });
    if (rows == 0) {
      throw new NoSuchElementException("Spell " + id + " not found");
    }
    return findById(id).orElseThrow(() -> new NoSuchElementException("Spell " + id + " not found"));
  }

  public void deleteById(long id) {
    int rows = jdbc.update("DELETE FROM spells WHERE id = ?", id);
    if (rows == 0) {
      throw new NoSuchElementException("Spell " + id + " not found");
    }
  }

  /**
   * Insert-or-update by natural key (name, provenance, owner_user_id).
   * Used by the content importer; returns the resulting row plus a flag
   * indicating whether it was newly inserted or replaced an existing row.
   */
  public UpsertResult upsert(Spell s) {
    if (s.getProvenance() == null || s.getProvenance().isEmpty()) {
      s.setProvenance("homebrew");
    }
    Optional<Spell> existing = findByNaturalKey(
        s.getName(), s.getProvenance(), s.getOwner_user_id());
    if (existing.isPresent()) {
      Spell e = existing.get();
      s.setId(e.getId());
      Spell updated = update(e.getId(), s);
      return new UpsertResult(updated, false);
    } else {
      return new UpsertResult(insert(s), true);
    }
  }

  public static final class UpsertResult {
    private final Spell spell;
    private final boolean created;
    public UpsertResult(Spell spell, boolean created) {
      this.spell = spell;
      this.created = created;
    }
    public Spell getSpell() { return spell; }
    public boolean isCreated() { return created; }
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
