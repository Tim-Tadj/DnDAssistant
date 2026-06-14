package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.MonsterRepository;
import com.pigishentertainment.dndassistant.domain.Monster;
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
@RequestMapping("/api/v1/monsters")
public class MonsterController {

  private final MonsterRepository repo;

  public MonsterController(MonsterRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public List<Monster> list() {
    return repo.findAll();
  }

  @GetMapping("/{id}")
  public Monster get(@PathVariable long id) {
    return repo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Monster " + id + " not found"));
  }

  @PostMapping
  public ResponseEntity<Monster> create(@RequestBody Monster body) {
    if (body == null || body.getName() == null || body.getName().isBlank()) {
      throw new IllegalArgumentException("Monster 'name' is required");
    }
    body.setId(null);
    body.setProvenance("homebrew");
    body.setOwner_user_id(null);
    Monster saved = repo.insert(body);
    return ResponseEntity.status(HttpStatus.CREATED).body(saved);
  }

  @PutMapping("/{id}")
  public Monster update(@PathVariable long id, @RequestBody Monster body) {
    return repo.update(id, body);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable long id) {
    repo.deleteById(id);
    return ResponseEntity.noContent().build();
  }
}
