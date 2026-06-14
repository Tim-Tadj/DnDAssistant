package com.pigishentertainment.dndassistant.data;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pigishentertainment.dndassistant.domain.CampaignNpc;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Repository
public class CampaignNpcRepository {

  private final NamedParameterJdbcTemplate jdbc;
  private final ObjectMapper json = new ObjectMapper();

  public CampaignNpcRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  private final RowMapper<CampaignNpc> rowMapper = (rs, rowNum) -> {
    CampaignNpc n = new CampaignNpc();
    n.setId(rs.getString("id"));
    n.setCampaign_id(rs.getString("campaign_id"));
    n.setOwner_user_id(rs.getString("owner_user_id"));
    n.setName(rs.getString("name"));
    n.setRole(rs.getString("role"));
    n.setRace(rs.getString("race"));
    n.setAlignment(rs.getString("alignment"));
    n.setDescription(rs.getString("description"));
    n.setStatus(rs.getString("status"));
    n.setLocation(rs.getString("location"));
    long mid = rs.getLong("monster_id");
    n.setMonster_id(rs.wasNull() ? null : mid);
    n.setNotes(rs.getString("notes"));
    String tags = rs.getString("campaign_tags");
    if (tags != null && !tags.isBlank()) {
      try {
        List<String> parsed = json.readValue(tags, new TypeReference<List<String>>() {});
        n.setCampaign_tags(parsed == null ? new ArrayList<>() : parsed);
      } catch (Exception e) {
        n.setCampaign_tags(new ArrayList<>());
      }
    }
    Timestamp created = rs.getTimestamp("created_at");
    if (created != null) n.setCreated_at(created.toInstant());
    Timestamp updated = rs.getTimestamp("updated_at");
    if (updated != null) n.setUpdated_at(updated.toInstant());
    return n;
  };

  public List<CampaignNpc> findByOwner(String ownerUserId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("uid", ownerUserId, Types.OTHER);
    return jdbc.query(
        "SELECT * FROM campaign_npcs WHERE owner_user_id = :uid ORDER BY lower(name)",
        p, rowMapper);
  }

  public List<CampaignNpc> findByOwnerAndCampaignTag(String ownerUserId, String campaignIdOrName) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("uid", ownerUserId, Types.OTHER);
    p.addValue("tag", "%" + campaignIdOrName + "%");
    return jdbc.query(
        "SELECT * FROM campaign_npcs"
            + " WHERE owner_user_id = :uid"
            + " AND (campaign_id = CAST(:tag AS UUID) OR campaign_tags LIKE :tag)"
            + " ORDER BY lower(name)",
        p, rowMapper);
  }

  public Optional<CampaignNpc> findById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    List<CampaignNpc> rows = jdbc.query(
        "SELECT * FROM campaign_npcs WHERE id = :id",
        p, rowMapper);
    return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
  }

  public CampaignNpc insert(CampaignNpc n) {
    MapSqlParameterSource p = paramsFor(n);
    jdbc.update(
        "INSERT INTO campaign_npcs (id, campaign_id, owner_user_id, name, role, race, alignment,"
            + " description, status, location, monster_id, notes, campaign_tags)"
            + " VALUES (:id, :campaign_id, :owner_user_id, :name, :role, :race, :alignment,"
            + " :description, :status, :location, :monster_id, :notes, :campaign_tags)",
        p);
    return findById(n.getId()).orElse(n);
  }

  public CampaignNpc update(String id, CampaignNpc n) {
    MapSqlParameterSource p = paramsFor(n).addValue("id", id, Types.OTHER);
    int rows = jdbc.update(
        "UPDATE campaign_npcs SET name=:name, role=:role, race=:race, alignment=:alignment,"
            + " description=:description, status=:status, location=:location,"
            + " monster_id=:monster_id, notes=:notes, campaign_tags=:campaign_tags,"
            + " updated_at=NOW()"
            + " WHERE id=:id",
        p);
    if (rows == 0) {
      throw new NoSuchElementException("NPC " + id + " not found");
    }
    return findById(id).orElseThrow(() -> new NoSuchElementException("NPC " + id + " not found"));
  }

  public void deleteById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    int rows = jdbc.update("DELETE FROM campaign_npcs WHERE id = :id", p);
    if (rows == 0) {
      throw new NoSuchElementException("NPC " + id + " not found");
    }
  }

  private MapSqlParameterSource paramsFor(CampaignNpc n) {
    String tagsJson;
    try {
      tagsJson = json.writeValueAsString(n.getCampaign_tags() == null ? List.of() : n.getCampaign_tags());
    } catch (Exception e) {
      tagsJson = "[]";
    }
    return new MapSqlParameterSource()
        .addValue("id", n.getId(), Types.OTHER)
        .addValue("campaign_id", n.getCampaign_id(), Types.OTHER)
        .addValue("owner_user_id", n.getOwner_user_id(), Types.OTHER)
        .addValue("name", n.getName())
        .addValue("role", n.getRole() == null ? "Notable" : n.getRole())
        .addValue("race", n.getRace() == null ? "" : n.getRace())
        .addValue("alignment", n.getAlignment() == null ? "" : n.getAlignment())
        .addValue("description", n.getDescription() == null ? "" : n.getDescription())
        .addValue("status", n.getStatus() == null ? "alive" : n.getStatus())
        .addValue("location", n.getLocation() == null ? "" : n.getLocation())
        .addValue("monster_id", n.getMonster_id())
        .addValue("notes", n.getNotes() == null ? "" : n.getNotes())
        .addValue("campaign_tags", tagsJson);
  }
}
