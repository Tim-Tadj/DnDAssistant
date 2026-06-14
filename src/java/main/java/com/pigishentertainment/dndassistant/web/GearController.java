package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.GearRepository;
import com.pigishentertainment.dndassistant.domain.Gear;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/v1/gear")
public class GearController {

  private final GearRepository repo;

  public GearController(GearRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public List<Gear> list(@RequestParam(value = "kind", required = false) String kind) {
    String userId = CurrentUser.idOrNull();
    if (kind != null && !kind.isBlank()) {
      return repo.findByKindVisibleTo(kind, userId);
    }
    return repo.findVisibleTo(userId);
  }

  @GetMapping("/{id}")
  public Gear get(@PathVariable long id) {
    return repo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Gear " + id + " not found"));
  }

  @PostMapping
  public ResponseEntity<Gear> create(@RequestBody Gear body) {
    if (body == null || body.getName() == null || body.getName().isBlank()) {
      throw new IllegalArgumentException("Gear 'name' is required");
    }
    validateKind(body.getKind());
    body.setId(null);
    body.setProvenance("homebrew");
    body.setOwner_user_id(CurrentUser.idOrNull());
    Gear saved = repo.insert(body);
    return ResponseEntity.status(HttpStatus.CREATED).body(saved);
  }

  @PutMapping("/{id}")
  public Gear update(@PathVariable long id, @RequestBody Gear body) {
    if (body == null || body.getName() == null || body.getName().isBlank()) {
      throw new IllegalArgumentException("Gear 'name' is required");
    }
    validateKind(body.getKind());
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
    Gear existing = repo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Gear " + id + " not found"));
    if (!"homebrew".equals(existing.getProvenance())) {
      throw new IllegalArgumentException("Only homebrew gear can be modified");
    }
    if (!userId.equals(existing.getOwner_user_id())) {
      throw new IllegalArgumentException("Only the owner can modify this gear");
    }
  }

  private static void validateKind(String kind) {
    if (kind == null
        || !(kind.equals("weapon") || kind.equals("armour") || kind.equals("gear"))) {
      throw new IllegalArgumentException("Gear 'kind' must be one of: weapon, armour, gear");
    }
  }
}
