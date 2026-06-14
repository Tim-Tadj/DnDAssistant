package com.pigishentertainment.dndassistant.data;

import com.pigishentertainment.dndassistant.domain.Party;
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
public class PartyRepository {

  private final NamedParameterJdbcTemplate jdbc;

  public PartyRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  private final RowMapper<Party> rowMapper = (rs, rowNum) -> {
    Party p = new Party();
    p.setId(rs.getString("id"));
    p.setName(rs.getString("name"));
    p.setDescription(rs.getString("description"));
    p.setOwner_user_id(rs.getString("owner_user_id"));
    Timestamp created = rs.getTimestamp("created_at");
    if (created != null) p.setCreated_at(created.toInstant());
    Timestamp updated = rs.getTimestamp("updated_at");
    if (updated != null) p.setUpdated_at(updated.toInstant());
    return p;
  };

  public List<Party> findByOwner(String ownerUserId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("owner", ownerUserId, Types.OTHER);
    List<Party> parties = jdbc.query(
        "SELECT * FROM parties WHERE owner_user_id = :owner ORDER BY updated_at DESC",
        p, rowMapper);
    for (Party party : parties) {
      party.setMember_ids(findMemberIds(party.getId()));
    }
    return parties;
  }

  public Optional<Party> findById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    List<Party> rows = jdbc.query(
        "SELECT * FROM parties WHERE id = :id",
        p, rowMapper);
    if (rows.isEmpty()) return Optional.empty();
    Party party = rows.get(0);
    party.setMember_ids(findMemberIds(party.getId()));
    return Optional.of(party);
  }

  public Party insert(Party p) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("id", p.getId(), Types.OTHER)
        .addValue("name", p.getName())
        .addValue("description", p.getDescription() == null ? "" : p.getDescription())
        .addValue("owner_user_id", p.getOwner_user_id(), Types.OTHER);
    jdbc.update(
        "INSERT INTO parties (id, name, description, owner_user_id)"
            + " VALUES (:id, :name, :description, :owner_user_id)",
        params);
    replaceMembers(p.getId(), p.getMember_ids());
    return findById(p.getId()).orElse(p);
  }

  public Party update(String id, Party p) {
    int rows = jdbc.update(
        "UPDATE parties SET name=:name, description=:description, updated_at=NOW()"
            + " WHERE id=:id",
        new MapSqlParameterSource()
                .addValue("id", id, Types.OTHER)
                .addValue("name", p.getName())
                .addValue("description", p.getDescription() == null ? "" : p.getDescription()));
    if (rows == 0) {
      throw new NoSuchElementException("Party " + id + " not found");
    }
    replaceMembers(id, p.getMember_ids());
    return findById(id).orElseThrow(() -> new NoSuchElementException("Party " + id + " not found"));
  }

  public void deleteById(String id) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("id", id, Types.OTHER);
    int rows = jdbc.update("DELETE FROM parties WHERE id = :id", p);
    if (rows == 0) {
      throw new NoSuchElementException("Party " + id + " not found");
    }
  }

  private List<String> findMemberIds(String partyId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("party_id", partyId, Types.OTHER);
    return jdbc.query(
        "SELECT character_id FROM party_members WHERE party_id = :party_id ORDER BY position",
        p, (rs, rowNum) -> rs.getString("character_id"));
  }

  private void replaceMembers(String partyId, List<String> memberIds) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("party_id", partyId, Types.OTHER);
    jdbc.update("DELETE FROM party_members WHERE party_id = :party_id", p);
    if (memberIds == null) return;
    int pos = 0;
    for (String memberId : memberIds) {
      if (memberId == null || memberId.isBlank()) continue;
      MapSqlParameterSource ins = new MapSqlParameterSource()
          .addValue("party_id", partyId, Types.OTHER)
          .addValue("character_id", memberId, Types.OTHER)
          .addValue("position", pos++);
      jdbc.update(
          "INSERT INTO party_members (party_id, character_id, position)"
              + " VALUES (:party_id, :character_id, :position)",
          ins);
    }
  }
}
