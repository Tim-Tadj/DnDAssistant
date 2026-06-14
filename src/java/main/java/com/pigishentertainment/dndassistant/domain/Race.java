package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Phase 4: a D&D 5e race. Read-mostly reference data. */
public class Race {
  @JsonProperty("id")              private Long id;
  @JsonProperty("name")            private String name;
  @JsonProperty("size")            private String size;
  @JsonProperty("speed")           private Integer speed;
  @JsonProperty("ability_bonuses") private String ability_bonuses;
  @JsonProperty("traits")          private String traits;
  @JsonProperty("source")          private String source;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getSize() { return size; }
  public void setSize(String size) { this.size = size; }
  public Integer getSpeed() { return speed; }
  public void setSpeed(Integer speed) { this.speed = speed; }
  public String getAbilityBonuses() { return ability_bonuses; }
  public void setAbilityBonuses(String ability_bonuses) { this.ability_bonuses = ability_bonuses; }
  public String getTraits() { return traits; }
  public void setTraits(String traits) { this.traits = traits; }
  public String getSource() { return source; }
  public void setSource(String source) { this.source = source; }
}
