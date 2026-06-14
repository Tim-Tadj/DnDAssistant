package com.pigishentertainment.dndassistant.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pigishentertainment.dndassistant.data.GearRepository;
import com.pigishentertainment.dndassistant.data.MonsterRepository;
import com.pigishentertainment.dndassistant.data.SpellRepository;
import com.pigishentertainment.dndassistant.domain.Gear;
import com.pigishentertainment.dndassistant.domain.Monster;
import com.pigishentertainment.dndassistant.domain.Spell;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Admin endpoint for bulk-importing normalized content. Designed for
 * the content ingestion pipeline (see docs/spec/content-ingestion.md):
 *
 *   source JSON (matches src/res shapes) → POST /api/v1/import → DB
 *
 * Idempotent on the natural key (name, kind?, provenance, owner_user_id).
 * Each item is upserted in its own transaction; failures on individual
 * items don't abort the batch. The response records imported/updated/
 * skipped/error counts so a CLI driver can report progress.
 *
 * Phase 3 delivers this. Auth lands in Phase 5; for now the endpoint is
 * open (consistent with the rest of the API).
 */
@RestController
@RequestMapping("/api/v1/import")
public class ImportController {

  private static final Set<String> KINDS = Set.of("spell", "monster", "gear");
  private static final Set<String> PROVENANCES = Set.of("srd", "derived", "homebrew");

  private final SpellRepository spells;
  private final MonsterRepository monsters;
  private final GearRepository gear;
  private final ObjectMapper mapper;

  public ImportController(
      SpellRepository spells,
      MonsterRepository monsters,
      GearRepository gear,
      ObjectMapper mapper) {
    this.spells = spells;
    this.monsters = monsters;
    this.gear = gear;
    this.mapper = mapper;
  }

  @PostMapping
  public ImportResult importBatch(@RequestBody ImportRequest body) {
    if (body == null || body.kind == null || !KINDS.contains(body.kind)) {
      throw new IllegalArgumentException(
          "Request 'kind' must be one of: spell, monster, gear");
    }
    if (body.provenance == null || !PROVENANCES.contains(body.provenance)) {
      throw new IllegalArgumentException(
          "Request 'provenance' must be one of: srd, derived, homebrew");
    }
    if (body.items == null) {
      body.items = mapper.createArrayNode();
    }
    if (!body.items.isArray()) {
      throw new IllegalArgumentException("'items' must be a JSON array");
    }

    ImportResult result = new ImportResult();
    for (JsonNode node : body.items) {
      try {
        String kind = body.kind;
        if (kind.equals("spell")) {
          importSpell(node, body.provenance, body.owner_user_id, result);
        } else if (kind.equals("monster")) {
          importMonster(node, body.provenance, body.owner_user_id, result);
        } else if (kind.equals("gear")) {
          importGear(node, body.provenance, body.owner_user_id, result);
        }
      } catch (Exception e) {
        String name = node.path("name").asText("(unnamed)");
        result.errors.add(new ImportError(name, e.getMessage()));
      }
    }
    return result;
  }

  private void importSpell(JsonNode node, String provenance, String owner, ImportResult result) {
    Spell s = mapper.convertValue(node, Spell.class);
    s.setProvenance(provenance);
    s.setOwner_user_id(owner);
    s.setId(null);
    SpellRepository.UpsertResult r = spells.upsert(s);
    if (r.isCreated()) result.imported++; else result.updated++;
  }

  private void importMonster(JsonNode node, String provenance, String owner, ImportResult result) {
    Monster m = mapper.convertValue(node, Monster.class);
    m.setProvenance(provenance);
    m.setOwner_user_id(owner);
    m.setId(null);
    MonsterRepository.UpsertResult r = monsters.upsert(m);
    if (r.isCreated()) result.imported++; else result.updated++;
  }

  private void importGear(JsonNode node, String provenance, String owner, ImportResult result) {
    Gear g = mapper.convertValue(node, Gear.class);
    g.setProvenance(provenance);
    g.setOwner_user_id(owner);
    g.setId(null);
    GearRepository.UpsertResult r = gear.upsert(g);
    if (r.isCreated()) result.imported++; else result.updated++;
  }

  public static class ImportRequest {
    public String kind;
    public String provenance;
    public String owner_user_id;
    /**
     * Items is an array of arbitrary JSON objects. We accept it as a
     * single JsonNode (the array) and iterate it in the controller.
     * Jackson maps a JSON array to a JsonNode transparently.
     */
    public JsonNode items;
  }

  public static class ImportResult {
    public int imported = 0;
    public int updated = 0;
    public int skipped = 0;
    public List<ImportError> errors = new ArrayList<>();
  }

  public static final class ImportError {
    private final String name;
    private final String reason;
    public ImportError(String name, String reason) {
      this.name = name;
      this.reason = reason;
    }
    public String getName() { return name; }
    public String getReason() { return reason; }
  }
}
