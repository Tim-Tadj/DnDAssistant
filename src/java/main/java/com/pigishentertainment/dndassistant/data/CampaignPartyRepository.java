package com.pigishentertainment.dndassistant.data;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.List;

/**
 * Phase 9: many-to-many link between campaigns and parties.
 * Just a thin wrapper around the campaign_parties junction table.
 */
@Repository
public class CampaignPartyRepository {

  private final NamedParameterJdbcTemplate jdbc;

  public CampaignPartyRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<String> findPartyIdsForCampaign(String campaignId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("cid", campaignId, Types.OTHER);
    return jdbc.queryForList(
        "SELECT party_id FROM campaign_parties WHERE campaign_id = :cid ORDER BY position ASC, added_at ASC",
        p, String.class);
  }

  public List<String> findCampaignIdsForParty(String partyId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("pid", partyId, Types.OTHER);
    return jdbc.queryForList(
        "SELECT campaign_id FROM campaign_parties WHERE party_id = :pid ORDER BY added_at ASC",
        p, String.class);
  }

  public void link(String campaignId, String partyId, int position) {
    MapSqlParameterSource p = new MapSqlParameterSource()
        .addValue("cid", campaignId, Types.OTHER)
        .addValue("pid", partyId, Types.OTHER)
        .addValue("position", position);
    jdbc.update(
        "INSERT INTO campaign_parties (campaign_id, party_id, position, added_at)"
            + " VALUES (:cid, :pid, :position, NOW())"
            + " ON CONFLICT (campaign_id, party_id) DO UPDATE SET position = EXCLUDED.position",
        p);
  }

  public void unlink(String campaignId, String partyId) {
    MapSqlParameterSource p = new MapSqlParameterSource()
        .addValue("cid", campaignId, Types.OTHER)
        .addValue("pid", partyId, Types.OTHER);
    jdbc.update("DELETE FROM campaign_parties WHERE campaign_id = :cid AND party_id = :pid", p);
  }

  public void unlinkByPartyId(String partyId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("pid", partyId, Types.OTHER);
    jdbc.update("DELETE FROM campaign_parties WHERE party_id = :pid", p);
  }

  public void unlinkByCampaignId(String campaignId) {
    MapSqlParameterSource p = new MapSqlParameterSource();
    p.addValue("cid", campaignId, Types.OTHER);
    jdbc.update("DELETE FROM campaign_parties WHERE campaign_id = :cid", p);
  }
}
