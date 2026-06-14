package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

/** Phase 4: a D&D 5e class. Read-mostly reference data. */
public class DndClass {
  @JsonProperty("id")              private Long id;
  @JsonProperty("name")            private String name;
  @JsonProperty("hit_die")         private String hit_die;
  @JsonProperty("primary_ability") private String primary_ability;
  @JsonProperty("description")     private String description;
  @JsonProperty("source")          private String source;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getHitDie() { return hit_die; }
  public void setHitDie(String hit_die) { this.hit_die = hit_die; }
  public String getPrimaryAbility() { return primary_ability; }
  public void setPrimaryAbility(String primary_ability) { this.primary_ability = primary_ability; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public String getSource() { return source; }
  public void setSource(String source) { this.source = source; }
}
