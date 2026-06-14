package com.pigishentertainment.dndassistant.data;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pigishentertainment.dndassistant.domain.Monster;
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
 * On startup, if the monsters table is empty, load the bundled Monster Manual
 * dataset ({@code monster_manual_monsters.json}) so the API has data to serve
 * before any user creates anything. Mirrors {@code SpellSeed}.
 */
@Component
public class MonsterSeed {

  private static final Logger log = LoggerFactory.getLogger(MonsterSeed.class);

  private final MonsterRepository repo;
  private final ObjectMapper mapper;

  public MonsterSeed(MonsterRepository repo, ObjectMapper mapper) {
    this.repo = repo;
    this.mapper = mapper;
  }

  @PostConstruct
  public void seedIfEmpty() {
    int existing = repo.count();
    if (existing > 0) {
      log.info("monsters table already has {} rows; skipping seed", existing);
      return;
    }
    List<Monster> bundled = loadBundled();
    if (bundled.isEmpty()) {
      log.warn("no bundled monsters found to seed; monsters table will be empty");
      return;
    }
    int ok = 0;
    for (Monster m : bundled) {
      try {
        m.setProvenance("derived");
        m.setOwner_user_id(null);
        repo.insert(m);
        ok++;
      } catch (IllegalStateException dup) {
        log.debug("skip duplicate: {}", m.getName());
      } catch (Exception e) {
        log.warn("failed to seed monster {}: {}", m.getName(), e.toString());
      }
    }
    log.info("seeded {} monsters from bundled monster_manual_monsters.json", ok);
  }

  private List<Monster> loadBundled() {
    Resource r = resolveSeed();
    if (r == null || !r.exists()) {
      return List.of();
    }
    try (InputStream in = r.getInputStream()) {
      List<Monster> raw = mapper.readValue(in, new TypeReference<List<Monster>>() {});
      return raw;
    } catch (IOException e) {
      log.warn("failed to read bundled monsters: {}", e.toString());
      return List.of();
    }
  }

  private Resource resolveSeed() {
    String[] candidates = new String[] {
        "monster_manual_monsters.json",
        "src/res/resources/monster_manual_monsters.json",
        "../res/resources/monster_manual_monsters.json"
    };
    for (String c : candidates) {
      Path p = Paths.get(c);
      if (Files.isRegularFile(p)) {
        log.info("seeding monsters from file system: {}", p.toAbsolutePath());
        return new FileSystemResource(p);
      }
    }
    ClassPathResource cp = new ClassPathResource("monster_manual_monsters.json");
    if (cp.exists()) {
      log.info("seeding monsters from classpath: monster_manual_monsters.json");
      return cp;
    }
    log.warn("bundled monster_manual_monsters.json not found in any known location");
    return null;
  }
}
