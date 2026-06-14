package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.CharacterRepository;
import com.pigishentertainment.dndassistant.data.CharacterStateRepository;
import com.pigishentertainment.dndassistant.domain.Character;
import com.pigishentertainment.dndassistant.domain.CharacterState;
import com.pigishentertainment.dndassistant.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.NoSuchElementException;

/**
 * Phase 8: in-session runtime state for a character (HP, conditions,
 * rest, death saves). Auto-created on first GET with current_hp =
 * the character's hp_max. PUT upserts.
 */
@RestController
@RequestMapping("/api/v1/characters/{id}/state")
public class CharacterStateController {

  private final CharacterStateRepository states;
  private final CharacterRepository characters;

  public CharacterStateController(CharacterStateRepository states, CharacterRepository characters) {
    this.states = states;
    this.characters = characters;
  }

  @GetMapping
  public CharacterState get(@PathVariable String id) {
    enforceOwnership(id);
    return states.getOrInit(id);
  }

  @PutMapping
  public CharacterState update(@PathVariable String id, @RequestBody CharacterState body) {
    enforceOwnership(id);
    if (body == null) throw new IllegalArgumentException("body is required");
    body.setCharacter_id(id);
    return states.upsert(body);
  }

  // ---- helpers ----

  private void enforceOwnership(String id) {
    String userId = CurrentUser.idOrNull();
    if (userId == null) {
      throw new IllegalArgumentException("Authentication required");
    }
    Character c = characters.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Character " + id + " not found"));
    if (!userId.equals(c.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the owner can modify this character's state");
    }
  }
}
