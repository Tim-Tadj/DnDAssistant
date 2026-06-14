package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.SpellRepository;
import com.pigishentertainment.dndassistant.domain.Spell;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.pigishentertainment.dndassistant.security.CurrentUser;

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

@RestController
@RequestMapping("/api/v1/spells")
public class SpellController {

  private final SpellRepository repo;

  public SpellController(SpellRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public List<Spell> list() {
    return repo.findVisibleTo(CurrentUser.idOrNull());
  }

  @GetMapping("/{id}")
  public Spell get(@PathVariable long id) {
    return repo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Spell " + id + " not found"));
  }

  @PostMapping
  public ResponseEntity<Spell> create(@RequestBody Spell body) {
    if (body == null || body.getName() == null || body.getName().isBlank()) {
      throw new IllegalArgumentException("Spell 'name' is required");
    }
    if (body.getLevel() == null || body.getLevel().isBlank()) {
      throw new IllegalArgumentException("Spell 'level' is required");
    }
    if (body.getSchool() == null || body.getSchool().isBlank()) {
      throw new IllegalArgumentException("Spell 'school' is required");
    }
    // Phase 5: only authenticated users can create spells; provenance
    // is always 'homebrew' and the JWT subject is the owner.
    body.setId(null);
    body.setProvenance("homebrew");
    body.setOwner_user_id(CurrentUser.idOrNull());
    Spell saved = repo.insert(body);
    return ResponseEntity.status(HttpStatus.CREATED).body(saved);
  }

  @PutMapping("/{id}")
  public Spell update(@PathVariable long id, @RequestBody Spell body) {
    // Phase 5: only the owner can update; SRD/derived are read-only.
    enforceOwnership(id);
    return repo.update(id, body);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable long id) {
    enforceOwnership(id);
    repo.deleteById(id);
    return ResponseEntity.noContent().build();
  }

  private void enforceOwnership(long id) {
    String userId = CurrentUser.idOrNull();
    if (userId == null) {
      throw new IllegalArgumentException("Authentication required");
    }
    Spell existing = repo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Spell " + id + " not found"));
    if (!"homebrew".equals(existing.getProvenance())) {
      throw new IllegalArgumentException("Only homebrew spells can be modified");
    }
    if (!userId.equals(existing.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the owner can modify this spell");
    }
  }
}
