package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.CharacterRepository;
import com.pigishentertainment.dndassistant.domain.Character;
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

/** Phase 4: characters, owned by the calling user. */
@RestController
@RequestMapping("/api/v1/characters")
public class CharacterController {

  private final CharacterRepository repo;

  public CharacterController(CharacterRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public List<Character> list() {
    String userId = CurrentUser.idOrNull();
    if (userId == null) {
      throw new IllegalArgumentException("Authentication required");
    }
    return repo.findByOwner(userId);
  }

  @GetMapping("/{id}")
  public Character get(@PathVariable String id) {
    return enforceOwnership(id);
  }

  @PostMapping
  public ResponseEntity<Character> create(@RequestBody Character body) {
    if (body == null || body.getName() == null || body.getName().isBlank()) {
      throw new IllegalArgumentException("name is required");
    }
    if (body.getRaceId() == null) {
      throw new IllegalArgumentException("race_id is required");
    }
    if (body.getClassId() == null) {
      throw new IllegalArgumentException("class_id is required");
    }
    String userId = CurrentUser.idOrNull();
    if (userId == null) {
      throw new IllegalArgumentException("Authentication required");
    }
    body.setId(UUID.randomUUID().toString());
    body.setOwner_user_id(userId);
    return ResponseEntity.status(HttpStatus.CREATED).body(repo.insert(body));
  }

  @PutMapping("/{id}")
  public Character update(@PathVariable String id, @RequestBody Character body) {
    enforceOwnership(id);
    return repo.update(id, body);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    enforceOwnership(id);
    repo.deleteById(id);
    return ResponseEntity.noContent().build();
  }

  private Character enforceOwnership(String id) {
    String userId = CurrentUser.idOrNull();
    if (userId == null) {
      throw new IllegalArgumentException("Authentication required");
    }
    Character c = repo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Character " + id + " not found"));
    if (!userId.equals(c.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the owner can modify this character");
    }
    return c;
  }
}
