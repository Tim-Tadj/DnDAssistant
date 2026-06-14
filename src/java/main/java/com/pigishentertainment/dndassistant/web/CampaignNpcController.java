package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.CampaignNpcRepository;
import com.pigishentertainment.dndassistant.data.CampaignRepository;
import com.pigishentertainment.dndassistant.data.MonsterRepository;
import com.pigishentertainment.dndassistant.domain.Campaign;
import com.pigishentertainment.dndassistant.domain.CampaignNpc;
import com.pigishentertainment.dndassistant.domain.Monster;
import com.pigishentertainment.dndassistant.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * Phase 8: campaign NPCs, owned by the calling user (transitively,
 * through the campaign's owner_user_id).
 */
@RestController
@RequestMapping("/api/v1/campaigns/{campaignId}/npcs")
public class CampaignNpcController {

  private final CampaignNpcRepository npcs;
  private final CampaignRepository campaigns;
  private final MonsterRepository monsters;

  public CampaignNpcController(CampaignNpcRepository npcs, CampaignRepository campaigns, MonsterRepository monsters) {
    this.npcs = npcs;
    this.campaigns = campaigns;
    this.monsters = monsters;
  }

  @GetMapping
  public List<CampaignNpc> list(@PathVariable String campaignId) {
    String userId = enforceCampaignOwnership(campaignId);
    // Phase 9: NPCs are now global per-user. Return NPCs that
    // either (a) have a legacy campaign_id pointing here, or
    // (b) tag this campaign in their campaign_tags list.
    return npcs.findByOwnerAndCampaignTag(userId, campaignId);
  }

  @GetMapping("/{id}")
  public CampaignNpc get(@PathVariable String campaignId, @PathVariable String id) {
    enforceCampaignOwnership(campaignId);
    return enforceNpcVisibility(campaignId, id);
  }

  @PostMapping
  public ResponseEntity<CampaignNpc> create(
      @PathVariable String campaignId,
      @RequestBody CampaignNpc body) {
    String userId = enforceCampaignOwnership(campaignId);
    if (body == null || body.getName() == null || body.getName().isBlank()) {
      throw new IllegalArgumentException("name is required");
    }
    body.setId(UUID.randomUUID().toString());
    body.setCampaign_id(campaignId);
    body.setOwner_user_id(userId);
    // Make sure the new NPC is tagged with this campaign.
    if (body.getCampaign_tags() == null) body.setCampaign_tags(new java.util.ArrayList<>());
    if (!body.getCampaign_tags().contains(campaignId)) {
      body.getCampaign_tags().add(campaignId);
    }
    validateMonster(body.getMonster_id());
    return ResponseEntity.status(HttpStatus.CREATED).body(npcs.insert(body));
  }

  @PutMapping("/{id}")
  public CampaignNpc update(
      @PathVariable String campaignId,
      @PathVariable String id,
      @RequestBody CampaignNpc body) {
    enforceCampaignOwnership(campaignId);
    enforceNpcOwnership(id);
    validateMonster(body.getMonster_id());
    return npcs.update(id, body);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @PathVariable String campaignId,
      @PathVariable String id) {
    enforceCampaignOwnership(campaignId);
    enforceNpcOwnership(id);
    npcs.deleteById(id);
    return ResponseEntity.noContent().build();
  }

  // ---- helpers ----

  private String requireUser() {
    String userId = CurrentUser.idOrNull();
    if (userId == null) {
      throw new IllegalArgumentException("Authentication required");
    }
    return userId;
  }

  private String enforceCampaignOwnership(String campaignId) {
    String userId = requireUser();
    Campaign c = campaigns.findById(campaignId)
        .orElseThrow(() -> new NoSuchElementException("Campaign " + campaignId + " not found"));
    if (!userId.equals(c.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the owner can modify this campaign");
    }
    return userId;
  }

  private CampaignNpc enforceNpcOwnership(String id) {
    String userId = requireUser();
    CampaignNpc n = npcs.findById(id)
        .orElseThrow(() -> new NoSuchElementException("NPC " + id + " not found"));
    if (!userId.equals(n.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the owner can modify this NPC");
    }
    return n;
  }

  /**
   * Phase 9: NPCs are now global, so "this NPC is in this
   * campaign" is by visibility (campaign_id or campaign_tags
   * contains the campaign id), not by ownership.
   */
  private CampaignNpc enforceNpcVisibility(String campaignId, String id) {
    CampaignNpc n = enforceNpcOwnership(id);
    boolean visible = campaignId.equals(n.getCampaign_id())
        || (n.getCampaign_tags() != null && n.getCampaign_tags().contains(campaignId));
    if (!visible) {
      throw new IllegalArgumentException("NPC " + id + " is not associated with campaign " + campaignId);
    }
    return n;
  }

  private void validateMonster(Long monsterId) {
    if (monsterId == null) return;
    Monster m = monsters.findById(monsterId).orElse(null);
    if (m == null) {
      throw new NoSuchElementException("Monster " + monsterId + " not found");
    }
  }
}
