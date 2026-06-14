package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.CampaignPartyRepository;
import com.pigishentertainment.dndassistant.data.CharacterRepository;
import com.pigishentertainment.dndassistant.data.PartyRepository;
import com.pigishentertainment.dndassistant.domain.Character;
import com.pigishentertainment.dndassistant.domain.Party;
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

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

/** Phase 8: parties, owned by the calling user. */
@RestController
@RequestMapping("/api/v1/parties")
public class PartyController {

  private final PartyRepository parties;
  private final CharacterRepository characters;
  private final CampaignPartyRepository campaignParties;

  public PartyController(PartyRepository parties, CharacterRepository characters, CampaignPartyRepository campaignParties) {
    this.parties = parties;
    this.characters = characters;
    this.campaignParties = campaignParties;
  }

  @GetMapping
  public List<Party> list() {
    String userId = requireUser();
    return parties.findByOwner(userId);
  }

  @GetMapping("/{id}")
  public Party get(@PathVariable String id) {
    return enforceOwnership(id);
  }

  @PostMapping
  public ResponseEntity<Party> create(@RequestBody Party body) {
    String userId = requireUser();
    if (body == null || body.getName() == null || body.getName().isBlank()) {
      throw new IllegalArgumentException("name is required");
    }
    body.setId(UUID.randomUUID().toString());
    body.setOwner_user_id(userId);
    validateMembers(userId, body.getMember_ids());
    return ResponseEntity.status(HttpStatus.CREATED).body(parties.insert(body));
  }

  @PutMapping("/{id}")
  public Party update(@PathVariable String id, @RequestBody Party body) {
    String userId = requireUser();
    enforceOwnership(id);
    if (body.getMember_ids() != null) {
      validateMembers(userId, body.getMember_ids());
    }
    return parties.update(id, body);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    enforceOwnership(id);
    campaignParties.unlinkByPartyId(id);
    parties.deleteById(id);
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

  private Party enforceOwnership(String id) {
    String userId = requireUser();
    Party p = parties.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Party " + id + " not found"));
    if (!userId.equals(p.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the owner can modify this party");
    }
    return p;
  }

  private void validateMembers(String userId, List<String> memberIds) {
    if (memberIds == null) return;
    List<String> valid = new ArrayList<>();
    for (String mid : memberIds) {
      if (mid == null || mid.isBlank()) continue;
      Character c = characters.findById(mid)
          .orElseThrow(() -> new NoSuchElementException("Character " + mid + " not found"));
      if (!userId.equals(c.getOwner_user_id())) {
        throw new IllegalArgumentException("Character " + mid + " is not owned by the current user");
      }
      valid.add(mid);
    }
  }
}
