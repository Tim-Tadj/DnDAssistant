package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.SpellRepository;
import com.pigishentertainment.dndassistant.domain.Spell;
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

@RestController
@RequestMapping("/api/v1/spells")
public class SpellController {

  private final SpellRepository repo;

  public SpellController(SpellRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public List<Spell> list() {
    return repo.findAll();
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
    // Phase 1: provenance defaults to 'homebrew' on create, owner is null
    // (auth lands in Phase 5; the owner_user_id column already exists).
    body.setId(null);
    body.setProvenance("homebrew");
    body.setOwner_user_id(null);
    Spell saved = repo.insert(body);
    return ResponseEntity.status(HttpStatus.CREATED).body(saved);
  }

  @PutMapping("/{id}")
  public Spell update(@PathVariable long id, @RequestBody Spell body) {
    // Phase 1: no auth, so any caller can update any row. Phase 5 will
    // restrict to owner. The id in the path is authoritative; body's
    // id (if any) is ignored. provenance/owner are also preserved
    // (homebrew/null for created-by-UI rows; existing values for SRD
    // rows are kept).
    return repo.update(id, body);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable long id) {
    repo.deleteById(id);
    return ResponseEntity.noContent().build();
  }
}
