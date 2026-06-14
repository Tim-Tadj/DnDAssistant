package com.pigishentertainment.dndassistant.data;

import com.pigishentertainment.dndassistant.domain.DndClass;
import com.pigishentertainment.dndassistant.domain.Race;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Seeds a small representative set of D&D 5e classes and races on first
 * boot. The list is intentionally short — enough to drive the
 * character editor and the encounter generator without committing to
 * a full PHB ingest. New SRD entries can be added via the importer
 * (provenance="srd") once a corpus is available.
 */
@Component
public class ReferenceDataSeed {

  private static final Logger log = LoggerFactory.getLogger(ReferenceDataSeed.class);

  private final ClassRepository classes;
  private final RaceRepository races;

  public ReferenceDataSeed(ClassRepository classes, RaceRepository races) {
    this.classes = classes;
    this.races = races;
  }

  @PostConstruct
  public void seedIfEmpty() {
    if (classes.findAll().isEmpty()) {
      for (DndClass c : DEFAULT_CLASSES) {
        try {
          classes.insert(c);
        } catch (Exception e) {
          log.debug("skip class seed: {}", e.getMessage());
        }
      }
      log.info("seeded {} classes", DEFAULT_CLASSES.length);
    }
    if (races.findAll().isEmpty()) {
      for (Race r : DEFAULT_RACES) {
        try {
          races.insert(r);
        } catch (Exception e) {
          log.debug("skip race seed: {}", e.getMessage());
        }
      }
      log.info("seeded {} races", DEFAULT_RACES.length);
    }
  }

  private static final DndClass[] DEFAULT_CLASSES = new DndClass[] {
    cls("Barbarian", "d12", "Strength", "A fierce warrior of primitive background who can enter a battle rage."),
    cls("Bard",      "d8",  "Charisma",  "An inspiring magician whose power echoes the music of creation."),
    cls("Cleric",    "d8",  "Wisdom",    "A priestly champion who wields divine magic in service of a higher power."),
    cls("Druid",     "d8",  "Wisdom",    "A priest of the Old Faith, wielding the powers of nature and adopting animal forms."),
    cls("Fighter",   "d10", "Strength",  "A master of martial combat, skilled with a variety of weapons and armor."),
    cls("Monk",      "d8",  "Dexterity", "A master of martial arts, harnessing the power of the body in pursuit of physical perfection."),
    cls("Paladin",   "d10", "Charisma",  "A holy warrior bound to a sacred oath."),
    cls("Ranger",    "d10", "Dexterity", "A warrior who uses martial prowess and nature magic to combat threats on the edges of civilization."),
    cls("Rogue",     "d8",  "Dexterity", "A scoundrel who uses stealth and trickery to overcome obstacles and enemies."),
    cls("Sorcerer",  "d6",  "Charisma",  "A spellcaster who draws on inherent magic from a gift or bloodline."),
    cls("Warlock",   "d8",  "Charisma",  "A wielder of magic derived from a bargain with an extraplanar entity."),
    cls("Wizard",    "d6",  "Intelligence", "A scholarly magic-user capable of manipulating the structures of reality."),
  };

  private static final Race[] DEFAULT_RACES = new Race[] {
    race("Dwarf",      "Medium", 25, "+2 Constitution", "Darkvision, dwarven resilience, stonecunning."),
    race("Elf",        "Medium", 30, "+2 Dexterity", "Darkvision, keen senses, fey ancestry, trance."),
    race("Halfling",   "Small",  25, "+2 Dexterity", "Lucky, brave, halfling nimbleness."),
    race("Human",      "Medium", 30, "+1 to all abilities", "Versatile: extra skill."),
    race("Dragonborn", "Medium", 30, "+2 Strength, +1 Charisma", "Draconic ancestry, breath weapon, damage resistance."),
    race("Gnome",      "Small",  25, "+2 Intelligence", "Darkvision, gnome cunning."),
    race("Half-Elf",   "Medium", 30, "+2 Charisma, +1 to two others", "Darkvision, fey ancestry, skill versatility."),
    race("Half-Orc",   "Medium", 30, "+2 Strength, +1 Constitution", "Darkvision, relentless endurance, savage attacks."),
    race("Tiefling",   "Medium", 30, "+2 Charisma, +1 Intelligence", "Darkvision, hellish resistance, infernal legacy."),
  };

  private static DndClass cls(String name, String hitDie, String primary, String description) {
    DndClass c = new DndClass();
    c.setName(name);
    c.setHitDie(hitDie);
    c.setPrimaryAbility(primary);
    c.setDescription(description);
    c.setSource("srd");
    return c;
  }

  private static Race race(String name, String size, int speed, String bonuses, String traits) {
    Race r = new Race();
    r.setName(name);
    r.setSize(size);
    r.setSpeed(speed);
    r.setAbilityBonuses(bonuses);
    r.setTraits(traits);
    r.setSource("srd");
    return r;
  }
}
