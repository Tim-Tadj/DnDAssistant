package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.CampaignRepository;
import com.pigishentertainment.dndassistant.data.CampaignSessionRepository;
import com.pigishentertainment.dndassistant.domain.Campaign;
import com.pigishentertainment.dndassistant.domain.CampaignSession;
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
 * Phase 8: campaign sessions, owned by the calling user (transitively,
 * through the campaign's owner_user_id).
 */
@RestController
@RequestMapping("/api/v1/campaigns/{campaignId}/sessions")
public class CampaignSessionController {

  private final CampaignSessionRepository sessions;
  private final CampaignRepository campaigns;

  public CampaignSessionController(CampaignSessionRepository sessions, CampaignRepository campaigns) {
    this.sessions = sessions;
    this.campaigns = campaigns;
  }

  @GetMapping
  public List<CampaignSession> list(@PathVariable String campaignId) {
    enforceCampaignOwnership(campaignId);
    return sessions.findByCampaign(campaignId);
  }

  @GetMapping("/{id}")
  public CampaignSession get(@PathVariable String campaignId, @PathVariable String id) {
    enforceCampaignOwnership(campaignId);
    return enforceSessionOwnership(campaignId, id);
  }

  @PostMapping
  public ResponseEntity<CampaignSession> create(
      @PathVariable String campaignId,
      @RequestBody CampaignSession body) {
    enforceCampaignOwnership(campaignId);
    if (body == null) throw new IllegalArgumentException("body is required");
    body.setId(UUID.randomUUID().toString());
    body.setCampaign_id(campaignId);
    return ResponseEntity.status(HttpStatus.CREATED).body(sessions.insert(body));
  }

  @PutMapping("/{id}")
  public CampaignSession update(
      @PathVariable String campaignId,
      @PathVariable String id,
      @RequestBody CampaignSession body) {
    enforceCampaignOwnership(campaignId);
    enforceSessionOwnership(campaignId, id);
    return sessions.update(id, body);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @PathVariable String campaignId,
      @PathVariable String id) {
    enforceCampaignOwnership(campaignId);
    enforceSessionOwnership(campaignId, id);
    sessions.deleteById(id);
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

  private void enforceCampaignOwnership(String campaignId) {
    String userId = requireUser();
    Campaign c = campaigns.findById(campaignId)
        .orElseThrow(() -> new NoSuchElementException("Campaign " + campaignId + " not found"));
    if (!userId.equals(c.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the owner can modify this campaign");
    }
  }

  private CampaignSession enforceSessionOwnership(String campaignId, String id) {
    CampaignSession s = sessions.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Session " + id + " not found"));
    if (!campaignId.equals(s.getCampaign_id())) {
      throw new IllegalArgumentException("Session " + id + " does not belong to campaign " + campaignId);
    }
    return s;
  }
}
