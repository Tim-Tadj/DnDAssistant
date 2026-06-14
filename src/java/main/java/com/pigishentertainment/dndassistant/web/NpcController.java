package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.CampaignNpcRepository;
import com.pigishentertainment.dndassistant.domain.CampaignNpc;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * Phase 9: NPCs are now global (per-user) and tagged with the
 * campaigns they appear in. Replaces the old
 * {@code /campaigns/{id}/npcs} controller (which is kept for
 * back-compat but the front end now calls these endpoints).
 *
 * <p>Ownership: every row has {@code owner_user_id}. Reads return
 * the calling user's NPCs; writes enforce that the row belongs to
 * the caller.
 */
@RestController
@RequestMapping("/api/v1/npcs")
public class NpcController {

  private final CampaignNpcRepository npcs;

  public NpcController(CampaignNpcRepository npcs) {
    this.npcs = npcs;
  }

  @GetMapping
  public List<CampaignNpc> list(@RequestParam(value = "campaign", required = false) String campaignTag) {
    String userId = requireUser();
    if (campaignTag != null && !campaignTag.isBlank()) {
      return npcs.findByOwnerAndCampaignTag(userId, campaignTag);
    }
    return npcs.findByOwner(userId);
  }

  @GetMapping("/{id}")
  public CampaignNpc get(@PathVariable String id) {
    return enforceOwnership(id);
  }

  @PostMapping
  public ResponseEntity<CampaignNpc> create(@RequestBody CampaignNpc body) {
    String userId = requireUser();
    if (body == null || body.getName() == null || body.getName().isBlank()) {
      throw new IllegalArgumentException("name is required");
    }
    body.setId(UUID.randomUUID().toString());
    body.setOwner_user_id(userId);
    return ResponseEntity.status(HttpStatus.CREATED).body(npcs.insert(body));
  }

  @PutMapping("/{id}")
  public CampaignNpc update(@PathVariable String id, @RequestBody CampaignNpc body) {
    enforceOwnership(id);
    return npcs.update(id, body);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    enforceOwnership(id);
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

  private CampaignNpc enforceOwnership(String id) {
    String userId = requireUser();
    CampaignNpc n = npcs.findById(id)
        .orElseThrow(() -> new NoSuchElementException("NPC " + id + " not found"));
    if (!userId.equals(n.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the owner can modify this NPC");
    }
    return n;
  }
}
