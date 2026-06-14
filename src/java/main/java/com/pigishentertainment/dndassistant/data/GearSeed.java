package com.pigishentertainment.dndassistant.data;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pigishentertainment.dndassistant.domain.Gear;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * On startup, if the gear table is empty, load the bundled SRD + custom
 * armaments from {@code srd_5e_weapons.json}, {@code srd_5e_armour.json},
 * {@code srd_5e_gear.json}, {@code custom_weapons.json},
 * {@code custom_armour.json}, and {@code custom_gear.json}.
 * Idempotent: skipped when rows already exist.
 */
@Component
public class GearSeed {

  private static final Logger log = LoggerFactory.getLogger(GearSeed.class);

  private final GearRepository repo;
  private final ObjectMapper mapper;

  public GearSeed(GearRepository repo, ObjectMapper mapper) {
    this.repo = repo;
    this.mapper = mapper;
  }

  @PostConstruct
  public void seedIfEmpty() {
    int existing = repo.count();
    if (existing > 0) {
      log.info("gear table already has {} rows; skipping seed", existing);
      return;
    }

    int ok = 0;
    ok += seed("weapon", "srd_5e_weapons.json", "derived");
    ok += seed("weapon", "custom_weapons.json", "homebrew");
    ok += seed("armour", "srd_5e_armour.json", "derived");
    ok += seed("armour", "custom_armour.json", "homebrew");
    ok += seed("gear", "srd_5e_gear.json", "derived");
    ok += seed("gear", "custom_gear.json", "homebrew");

    log.info("seeded {} gear rows from bundled JSON", ok);
  }

  private int seed(String kind, String fileName, String provenance) {
    List<SeedEntry> bundled = loadBundled(fileName);
    if (bundled.isEmpty()) {
      log.debug("no bundled rows in {}; skipping kind={}", fileName, kind);
      return 0;
    }
    int ok = 0;
    for (SeedEntry raw : bundled) {
      try {
        Gear g = raw.toDomain(kind);
        g.setProvenance(provenance);
        g.setOwner_user_id(null);
        repo.insert(g);
        ok++;
      } catch (IllegalStateException dup) {
        log.debug("skip duplicate: {}", raw.name);
      } catch (Exception e) {
        log.warn("failed to seed {} from {}: {}", raw.name, fileName, e.toString());
      }
    }
    return ok;
  }

  private List<SeedEntry> loadBundled(String fileName) {
    Resource r = resolveSeed(fileName);
    if (r == null || !r.exists()) {
      return List.of();
    }
    try (InputStream in = r.getInputStream()) {
      return mapper.readValue(in, new TypeReference<List<SeedEntry>>() {});
    } catch (IOException e) {
      log.warn("failed to read bundled {}: {}", fileName, e.toString());
      return List.of();
    }
  }

  private Resource resolveSeed(String fileName) {
    String[] candidates = new String[] {
        fileName,
        "src/res/resources/" + fileName,
        "../res/resources/" + fileName
    };
    for (String c : candidates) {
      Path p = Paths.get(c);
      if (Files.isRegularFile(p)) {
        return new FileSystemResource(p);
      }
    }
    ClassPathResource cp = new ClassPathResource(fileName);
    if (cp.exists()) {
      return cp;
    }
    log.debug("bundled {} not found in any known location", fileName);
    return null;
  }

  /**
   * Mirrors the union of shapes in the bundled JSON files. Fields that
   * don't apply to a given kind stay null and are mapped to a nullable
   * column in the DB.
   */
  static class SeedEntry {
    public String name;
    public String cost;
    public String damage;
    public String weight;
    public String properties;
    public String AC;
    public String strength;
    public String stealth;
    public String type;
    public String description;

    Gear toDomain(String kind) {
      Gear g = new Gear();
      g.setName(name);
      g.setKind(kind);
      g.setCost(cost == null ? "" : cost);
      g.setWeight(weight == null ? "" : weight);
      g.setType(type == null ? "" : type);
      g.setDamage(damage);
      g.setProperties(properties);
      g.setAc(AC);
      g.setStrength(strength);
      g.setStealth(stealth);
      g.setDescription(description);
      return g;
    }
  }
}
