package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.CampaignRepository;
import com.pigishentertainment.dndassistant.data.EncounterSaveRepository;
import com.pigishentertainment.dndassistant.domain.Campaign;
import com.pigishentertainment.dndassistant.domain.EncounterSave;
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

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * Phase 8: encounter saves (snapshots of generated encounters).
 * Personal saves at /encounter-saves; campaign-attached saves at
 * /campaigns/{id}/encounters.
 */
@RestController
public class EncounterSaveController {

  private final EncounterSaveRepository saves;
  private final CampaignRepository campaigns;

  public EncounterSaveController(EncounterSaveRepository saves, CampaignRepository campaigns) {
    this.saves = saves;
    this.campaigns = campaigns;
  }

  // ---- personal saves (campaign_id = null) ----

  @GetMapping("/api/v1/encounter-saves")
  public List<EncounterSave> list() {
    String userId = requireUser();
    return saves.findByOwner(userId);
  }

  @PostMapping("/api/v1/encounter-saves")
  public ResponseEntity<EncounterSave> create(@RequestBody EncounterSave body) {
    String userId = requireUser();
    if (body == null) throw new IllegalArgumentException("body is required");
    body.setId(UUID.randomUUID().toString());
    body.setOwner_user_id(userId);
    // If a campaign is attached, the caller must own it.
    if (body.getCampaign_id() != null) {
      enforceCampaignOwnership(body.getCampaign_id());
    }
    return ResponseEntity.status(HttpStatus.CREATED).body(saves.insert(body));
  }

  @DeleteMapping("/api/v1/encounter-saves/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    String userId = requireUser();
    EncounterSave e = saves.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Encounter save " + id + " not found"));
    if (!userId.equals(e.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the owner can delete this encounter save");
    }
    saves.deleteById(id);
    return ResponseEntity.noContent().build();
  }

  // ---- campaign-scoped listing ----

  @GetMapping("/api/v1/campaigns/{campaignId}/encounters")
  public List<EncounterSave> listForCampaign(@PathVariable String campaignId) {
    enforceCampaignOwnership(campaignId);
    return saves.findByCampaign(campaignId);
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
}
