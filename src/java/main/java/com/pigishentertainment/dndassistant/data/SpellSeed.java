package com.pigishentertainment.dndassistant.data;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pigishentertainment.dndassistant.domain.Spell;
import com.pigishentertainment.dndassistant.domain.SpellComponent;
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
 * On startup, if the spells table is empty, load bundled SRD spells from
 * {@code srd_5e_spells.json} (file system or classpath) so the API has data
 * to serve before any user creates anything.
 *
 * The path is intentionally tolerant: in dev, the file is read directly from
 * {@code src/res/resources/} (the same JSON the React app imports). In a
 * packaged jar, it can also be resolved from the classpath.
 */
@Component
public class SpellSeed {

  private static final Logger log = LoggerFactory.getLogger(SpellSeed.class);

  private final SpellRepository repo;
  private final ObjectMapper mapper;

  public SpellSeed(SpellRepository repo, ObjectMapper mapper) {
    this.repo = repo;
    this.mapper = mapper;
  }

  @PostConstruct
  public void seedIfEmpty() {
    int existing = repo.count();
    if (existing > 0) {
      log.info("spells table already has {} rows; skipping seed", existing);
      return;
    }
    List<Spell> bundled = loadBundled();
    if (bundled.isEmpty()) {
      log.warn("no bundled spells found to seed; spells table will be empty");
      return;
    }
    int ok = 0;
    for (Spell s : bundled) {
      try {
        s.setProvenance("srd");
        s.setOwner_user_id(null);
        repo.insert(s);
        ok++;
      } catch (IllegalStateException dup) {
        log.debug("skip duplicate: {}", s.getName());
      } catch (Exception e) {
        log.warn("failed to seed spell {}: {}", s.getName(), e.toString());
      }
    }
    log.info("seeded {} spells from bundled srd_5e_spells.json", ok);
  }

  private List<Spell> loadBundled() {
    Resource r = resolveSeed();
    if (r == null || !r.exists()) {
      return List.of();
    }
    try (InputStream in = r.getInputStream()) {
      List<SeedSpell> raw = mapper.readValue(in, new TypeReference<List<SeedSpell>>() {});
      return raw.stream().map(SeedSpell::toDomain)
          .collect(java.util.stream.Collectors.toList());
    } catch (IOException e) {
      log.warn("failed to read bundled spells: {}", e.toString());
      return List.of();
    }
  }

  private Resource resolveSeed() {
    String[] candidates = new String[] {
        "srd_5e_spells.json",
        "src/res/resources/srd_5e_spells.json",
        "../res/resources/srd_5e_spells.json"
    };
    for (String c : candidates) {
      Path p = Paths.get(c);
      if (Files.isRegularFile(p)) {
        log.info("seeding spells from file system: {}", p.toAbsolutePath());
        return new FileSystemResource(p);
      }
    }
    ClassPathResource cp = new ClassPathResource("srd_5e_spells.json");
    if (cp.exists()) {
      log.info("seeding spells from classpath: srd_5e_spells.json");
      return cp;
    }
    log.warn("bundled srd_5e_spells.json not found in any known location");
    return null;
  }

  /**
   * Mirrors the SRD JSON shape; components is an object, classes/tags are
   * arrays. Only the fields we need to seed the DB.
   */
  static class SeedSpell {
    public String name;
    public String level;
    public String school;
    public String type;
    public String casting_time;
    public String range;
    public String duration;
    public Boolean ritual;
    public String description;
    public String higher_levels;
    public List<String> classes;
    public List<String> tags;
    public SeedComponent components;

    Spell toDomain() {
      Spell s = new Spell();
      s.setName(name);
      s.setLevel(level == null ? "cantrip" : level);
      s.setSchool(school == null ? "" : school);
      s.setType(type == null ? "" : type);
      s.setCasting_time(casting_time == null ? "" : casting_time);
      s.setRange(range == null ? "" : range);
      s.setDuration(duration == null ? "" : duration);
      s.setRitual(ritual != null && ritual);
      s.setDescription(description == null ? "" : description);
      s.setHigher_levels(higher_levels == null ? "" : higher_levels);
      s.setClasses(classes == null ? List.of() : classes);
      s.setTags(tags == null ? List.of() : tags);
      SpellComponent c = new SpellComponent();
      if (components != null) {
        c.setMaterial(components.material != null && components.material);
        c.setSomatic(components.somatic != null && components.somatic);
        c.setVerbal(components.verbal != null && components.verbal);
        c.setMaterials_needed(components.materials_needed == null ? List.of() : components.materials_needed);
        c.setRaw(components.raw == null ? "" : components.raw);
      }
      s.setComponents(c);
      return s;
    }
  }

  static class SeedComponent {
    public Boolean material;
    public Boolean somatic;
    public Boolean verbal;
    public List<String> materials_needed;
    public String raw;
  }
}
