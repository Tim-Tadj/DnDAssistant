package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.CampaignPartyRepository;
import com.pigishentertainment.dndassistant.data.CampaignRepository;
import com.pigishentertainment.dndassistant.data.PartyRepository;
import com.pigishentertainment.dndassistant.domain.Campaign;
import com.pigishentertainment.dndassistant.domain.Party;
import com.pigishentertainment.dndassistant.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Phase 9: many-to-many link between a campaign and parties owned by
 * the same user. A campaign can have multiple parties (players, BBEG,
 * side NPCs), and a party can be linked to multiple campaigns.
 */
@RestController
@RequestMapping("/api/v1/campaigns/{id}/parties")
public class CampaignPartyController {

  private final CampaignPartyRepository links;
  private final PartyRepository parties;
  private final CampaignRepository campaigns;

  public CampaignPartyController(
      CampaignPartyRepository links,
      PartyRepository parties,
      CampaignRepository campaigns) {
    this.links = links;
    this.parties = parties;
    this.campaigns = campaigns;
  }

  @GetMapping
  public List<Party> list(@PathVariable("id") String campaignId) {
    enforceCampaignOwnership(campaignId);
    List<String> ids = links.findPartyIdsForCampaign(campaignId);
    List<Party> result = new ArrayList<>();
    for (String pid : ids) {
      parties.findById(pid).ifPresent(result::add);
    }
    return result;
  }

  /**
   * Link a party to a campaign. The party must be owned by the same
   * user as the campaign. Body: {"party_id": "..."}.
   */
  @PostMapping
  public ResponseEntity<Party> link(@PathVariable("id") String campaignId, @RequestBody Map<String, String> body) {
    String userId = enforceCampaignOwnership(campaignId);
    if (body == null || body.get("party_id") == null || body.get("party_id").isBlank()) {
      throw new IllegalArgumentException("party_id is required");
    }
    String partyId = body.get("party_id");
    Party p = parties.findById(partyId)
        .orElseThrow(() -> new NoSuchElementException("Party " + partyId + " not found"));
    if (!userId.equals(p.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the owner of both campaign and party can link them");
    }
    int position = links.findPartyIdsForCampaign(campaignId).size();
    links.link(campaignId, partyId, position);
    return ResponseEntity.status(HttpStatus.CREATED).body(p);
  }

  @DeleteMapping("/{partyId}")
  public void unlink(@PathVariable("id") String campaignId, @PathVariable String partyId) {
    String userId = enforceCampaignOwnership(campaignId);
    Party p = parties.findById(partyId)
        .orElseThrow(() -> new NoSuchElementException("Party " + partyId + " not found"));
    if (!userId.equals(p.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the owner of both campaign and party can unlink them");
    }
    links.unlink(campaignId, partyId);
  }

  // ---- helpers ----

  private String enforceCampaignOwnership(String campaignId) {
    String userId = CurrentUser.idOrNull();
    if (userId == null) {
      throw new IllegalArgumentException("Authentication required");
    }
    Campaign c = campaigns.findById(campaignId)
        .orElseThrow(() -> new NoSuchElementException("Campaign " + campaignId + " not found"));
    if (!userId.equals(c.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the campaign owner can manage its parties");
    }
    return userId;
  }
}
