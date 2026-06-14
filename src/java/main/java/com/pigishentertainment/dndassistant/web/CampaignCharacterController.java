package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.CampaignCharacterRepository;
import com.pigishentertainment.dndassistant.data.CampaignRepository;
import com.pigishentertainment.dndassistant.data.CharacterRepository;
import com.pigishentertainment.dndassistant.domain.Campaign;
import com.pigishentertainment.dndassistant.domain.CampaignCharacter;
import com.pigishentertainment.dndassistant.domain.Character;
import com.pigishentertainment.dndassistant.security.CurrentUser;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * Phase 9: per-campaign character state. Lets a DM bring a character
 * into a campaign, give them a different level / max HP, and track
 * their conditions / death saves / hit-dice for that campaign
 * separately from their global state.
 */
@RestController
@RequestMapping("/api/v1/campaigns/{id}/characters")
public class CampaignCharacterController {

  private final CampaignCharacterRepository repo;
  private final CampaignRepository campaigns;
  private final CharacterRepository characters;

  public CampaignCharacterController(
      CampaignCharacterRepository repo,
      CampaignRepository campaigns,
      CharacterRepository characters) {
    this.repo = repo;
    this.campaigns = campaigns;
    this.characters = characters;
  }

  @GetMapping
  public List<CampaignCharacter> list(@PathVariable("id") String campaignId) {
    enforceCampaignOwnership(campaignId);
    return repo.findByCampaignId(campaignId);
  }

  @GetMapping("/{characterId}")
  public CampaignCharacter get(@PathVariable("id") String campaignId, @PathVariable String characterId) {
    enforceCampaignOwnership(campaignId);
    enforceCharacterOwnership(characterId);
    return repo.findByCampaignAndCharacter(campaignId, characterId)
        .orElseGet(() -> {
          Character c = characters.findById(characterId).orElseThrow();
          return repo.getOrInit(campaignId, characterId,
              c.getLevel() == null ? 1 : c.getLevel(),
              c.getHpMax() == null ? 10 : c.getHpMax());
        });
  }

  @PutMapping("/{characterId}")
  public CampaignCharacter upsert(
      @PathVariable("id") String campaignId,
      @PathVariable String characterId,
      @RequestBody CampaignCharacter body) {
    enforceCampaignOwnership(campaignId);
    enforceCharacterOwnership(characterId);
    if (body == null) throw new IllegalArgumentException("body is required");
    body.setCampaign_id(campaignId);
    body.setCharacter_id(characterId);
    return repo.upsert(body);
  }

  @DeleteMapping("/{characterId}")
  public void remove(
      @PathVariable("id") String campaignId,
      @PathVariable String characterId) {
    enforceCampaignOwnership(campaignId);
    enforceCharacterOwnership(characterId);
    repo.deleteByCampaignAndCharacter(campaignId, characterId);
  }

  // ---- helpers ----

  private void enforceCampaignOwnership(String campaignId) {
    String userId = CurrentUser.idOrNull();
    if (userId == null) {
      throw new IllegalArgumentException("Authentication required");
    }
    Campaign c = campaigns.findById(campaignId)
        .orElseThrow(() -> new NoSuchElementException("Campaign " + campaignId + " not found"));
    if (!userId.equals(c.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the campaign owner can modify campaign characters");
    }
  }

  private void enforceCharacterOwnership(String characterId) {
    String userId = CurrentUser.idOrNull();
    if (userId == null) {
      throw new IllegalArgumentException("Authentication required");
    }
    Character c = characters.findById(characterId)
        .orElseThrow(() -> new NoSuchElementException("Character " + characterId + " not found"));
    if (!userId.equals(c.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the character owner can attach this character to a campaign");
    }
  }
}
