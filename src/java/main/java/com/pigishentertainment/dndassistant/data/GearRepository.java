package com.pigishentertainment.dndassistant.data;

import com.pigishentertainment.dndassistant.domain.Gear;
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
public class GearRepository {

  private static final String COLUMNS =
      "id, name, kind, cost, weight, type,"
          + " damage, properties, ac, strength, stealth, description,"
          + " provenance, owner_user_id, created_at, updated_at";

  private static final String INSERT_SQL = "INSERT INTO gear ("
      + "name, kind, cost, weight, type,"
      + " damage, properties, ac, strength, stealth, description,"
      + " provenance, owner_user_id)"
      + " VALUES (:name, :kind, :cost, :weight, :type,"
      + " :damage, :properties, :ac, :strength, :stealth, :description,"
      + " :provenance, :owner_user_id)";

  private final NamedParameterJdbcTemplate jdbc;
  private final RowMapper<Gear> rowMapper;

  public GearRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
    this.rowMapper = (rs, rowNum) -> mapRow(rs);
  }

  private static Gear mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
    Gear g = new Gear();
    g.setId(rs.getLong("id"));
    g.setName(rs.getString("name"));
    g.setKind(rs.getString("kind"));
    g.setCost(rs.getString("cost"));
    g.setWeight(rs.getString("weight"));
    g.setType(rs.getString("type"));
    g.setDamage(rs.getString("damage"));
    g.setProperties(rs.getString("properties"));
    g.setAc(rs.getString("ac"));
    g.setStrength(rs.getString("strength"));
    g.setStealth(rs.getString("stealth"));
    g.setDescription(rs.getString("description"));
    g.setProvenance(rs.getString("provenance"));
    g.setOwner_user_id(rs.getString("owner_user_id"));
    Timestamp created = rs.getTimestamp("created_at");
    if (created != null) g.setCreated_at(created.toInstant());
    Timestamp updated = rs.getTimestamp("updated_at");
    if (updated != null) g.setUpdated_at(updated.toInstant());
    return g;
  }

  public List<Gear> findAll() {
    return jdbc.query("SELECT " + COLUMNS + " FROM gear ORDER BY kind, name", rowMapper);
  }

  public List<Gear> findByKind(String kind) {
    return jdbc.query("SELECT " + COLUMNS + " FROM gear WHERE kind = :kind ORDER BY name",
        new MapSqlParameterSource("kind", kind), rowMapper);
  }

  public Optional<Gear> findById(long id) {
    List<Gear> rows = jdbc.query(
        "SELECT " + COLUMNS + " FROM gear WHERE id = :id",
        new MapSqlParameterSource("id", id),
        rowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public int count() {
    Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM gear",
        new MapSqlParameterSource(), Integer.class);
    return n == null ? 0 : n;
  }

  public Gear insert(Gear g) {
    if (g.getProvenance() == null || g.getProvenance().isEmpty()) {
      g.setProvenance("homebrew");
    }
    KeyHolder kh = new GeneratedKeyHolder();
    try {
      jdbc.update(INSERT_SQL, paramsFor(g), kh, new String[] {"id"});
    } catch (DuplicateKeyException e) {
      throw new IllegalStateException("A gear entry named '" + g.getName()
          + "' (kind=" + g.getKind() + ", provenance=" + g.getProvenance()
          + ") already exists", e);
    }
    Number key = kh.getKey();
    if (key != null) {
      g.setId(key.longValue());
    }
    return findById(g.getId()).orElse(g);
  }

  private static MapSqlParameterSource paramsFor(Gear g) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("name", g.getName());
    p.addValue("kind", g.getKind());
    p.addValue("cost", nullToEmpty(g.getCost()));
    p.addValue("weight", nullToEmpty(g.getWeight()));
    p.addValue("type", nullToEmpty(g.getType()));
    p.addValue("damage", g.getDamage());
    p.addValue("properties", g.getProperties());
    p.addValue("ac", g.getAc());
    p.addValue("strength", g.getStrength());
    p.addValue("stealth", g.getStealth());
    p.addValue("description", g.getDescription());
    p.addValue("provenance", g.getProvenance());
    p.addValue("owner_user_id", g.getOwner_user_id());
    return p;
  }

  private static String nullToEmpty(String s) {
    return s == null ? "" : s;
  }

  public Gear update(long id, Gear body) {
    if (body == null || body.getName() == null || body.getName().isBlank()) {
      throw new IllegalArgumentException("Gear 'name' is required");
    }
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id);
    p.addValue("name", body.getName());
    p.addValue("kind", body.getKind());
    p.addValue("cost", nullToEmpty(body.getCost()));
    p.addValue("weight", nullToEmpty(body.getWeight()));
    p.addValue("type", nullToEmpty(body.getType()));
    p.addValue("damage", body.getDamage());
    p.addValue("properties", body.getProperties());
    p.addValue("ac", body.getAc());
    p.addValue("strength", body.getStrength());
    p.addValue("stealth", body.getStealth());
    p.addValue("description", body.getDescription());
    int rows = jdbc.update(
        "UPDATE gear SET"
            + " name=:name, kind=:kind, cost=:cost, weight=:weight, type=:type,"
            + " damage=:damage, properties=:properties, ac=:ac,"
            + " strength=:strength, stealth=:stealth, description=:description,"
            + " updated_at=NOW()"
            + " WHERE id=:id",
        p);
    if (rows == 0) {
      throw new NoSuchElementException("Gear " + id + " not found");
    }
    return findById(id).orElseThrow(() -> new NoSuchElementException("Gear " + id + " not found"));
  }

  public void deleteById(long id) {
    int rows = jdbc.update("DELETE FROM gear WHERE id = :id",
        new MapSqlParameterSource("id", id));
    if (rows == 0) {
      throw new NoSuchElementException("Gear " + id + " not found");
    }
  }

  public Optional<Gear> findByNaturalKey(String name, String kind, String provenance, String ownerUserId) {
    String sql = "SELECT " + COLUMNS + " FROM gear"
        + " WHERE name = :name AND kind = :kind AND provenance = :provenance"
        + " AND owner_user_id IS NOT DISTINCT FROM :owner";
    MapSqlParameterSource p = new MapSqlParameterSource()
        .addValue("name", name)
        .addValue("kind", kind)
        .addValue("provenance", provenance)
        .addValue("owner", ownerUserId);
    List<Gear> rows = jdbc.query(sql, p, rowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public UpsertResult upsert(Gear g) {
    if (g.getProvenance() == null || g.getProvenance().isEmpty()) {
      g.setProvenance("homebrew");
    }
    Optional<Gear> existing = findByNaturalKey(
        g.getName(), g.getKind(), g.getProvenance(), g.getOwner_user_id());
    if (existing.isPresent()) {
      Gear e = existing.get();
      g.setId(e.getId());
      Gear updated = update(e.getId(), g);
      return new UpsertResult(updated, false);
    } else {
      return new UpsertResult(insert(g), true);
    }
  }

  public static final class UpsertResult {
    private final Gear gear;
    private final boolean created;
    public UpsertResult(Gear gear, boolean created) {
      this.gear = gear;
      this.created = created;
    }
    public Gear getGear() { return gear; }
    public boolean isCreated() { return created; }
  }
}
