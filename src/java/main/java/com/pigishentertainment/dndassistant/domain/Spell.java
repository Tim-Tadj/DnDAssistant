package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class Spell {
  private Long id;
  private String name;
  private String level;
  private String school;
  private String type;
  private String casting_time;
  private String range;
  private String duration;
  private boolean ritual;
  private String description;
  private String higher_levels;
  private List<String> classes = new ArrayList<>();
  private List<String> tags = new ArrayList<>();
  private SpellComponent components = new SpellComponent();
  private String provenance = "srd";
  private String owner_user_id;
  private Instant created_at;
  private Instant updated_at;

  public Spell() {}

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }

  public String getLevel() { return level; }
  public void setLevel(String level) { this.level = level; }

  public String getSchool() { return school; }
  public void setSchool(String school) { this.school = school; }

  public String getType() { return type; }
  public void setType(String type) { this.type = type; }

  public String getCasting_time() { return casting_time; }
  public void setCasting_time(String casting_time) { this.casting_time = casting_time; }

  public String getRange() { return range; }
  public void setRange(String range) { this.range = range; }

  public String getDuration() { return duration; }
  public void setDuration(String duration) { this.duration = duration; }

  public boolean isRitual() { return ritual; }
  public void setRitual(boolean ritual) { this.ritual = ritual; }

  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }

  public String getHigher_levels() { return higher_levels; }
  public void setHigher_levels(String higher_levels) { this.higher_levels = higher_levels; }

  public List<String> getClasses() { return classes; }
  public void setClasses(List<String> classes) {
    this.classes = classes == null ? new ArrayList<>() : classes;
  }

  public List<String> getTags() { return tags; }
  public void setTags(List<String> tags) {
    this.tags = tags == null ? new ArrayList<>() : tags;
  }

  public SpellComponent getComponents() { return components; }
  public void setComponents(SpellComponent components) {
    this.components = components == null ? new SpellComponent() : components;
  }

  public String getProvenance() { return provenance; }
  public void setProvenance(String provenance) { this.provenance = provenance; }

  public String getOwner_user_id() { return owner_user_id; }
  public void setOwner_user_id(String owner_user_id) { this.owner_user_id = owner_user_id; }

  public Instant getCreated_at() { return created_at; }
  public void setCreated_at(Instant created_at) { this.created_at = created_at; }

  public Instant getUpdated_at() { return updated_at; }
  public void setUpdated_at(Instant updated_at) { this.updated_at = updated_at; }
}
