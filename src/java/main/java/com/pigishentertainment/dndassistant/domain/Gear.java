package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

/**
 * One domain for weapons, armour, and gear. The DB has a single
 * {@code gear} table discriminated by {@code kind}. Type-specific fields
 * (damage/properties for weapons; AC/strength/stealth for armour) are
 * nullable. Wire format uses PascalCase for multi-word fields, matching
 * the Monster convention.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Gear {
  private Long id;

  @JsonProperty("name")        private String name;
  /** "weapon" | "armour" | "gear" */
  @JsonProperty("kind")        private String kind;
  @JsonProperty("cost")        private String cost;
  @JsonProperty("weight")      private String weight;
  @JsonProperty("type")        private String type;

  // Weapon-specific
  @JsonProperty("Damage")      private String damage;
  @JsonProperty("Properties")  private String properties;

  // Armour-specific
  @JsonProperty("AC")          private String ac;
  @JsonProperty("Strength")    private String strength;
  @JsonProperty("Stealth")     private String stealth;

  @JsonProperty("description") private String description;

  @JsonProperty("provenance")    private String provenance = "homebrew";
  @JsonProperty("owner_user_id") private String owner_user_id;
  @JsonProperty("created_at")    private Instant created_at;
  @JsonProperty("updated_at")    private Instant updated_at;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }

  public String getKind() { return kind; }
  public void setKind(String kind) { this.kind = kind; }

  public String getCost() { return cost; }
  public void setCost(String cost) { this.cost = cost; }

  public String getWeight() { return weight; }
  public void setWeight(String weight) { this.weight = weight; }

  public String getType() { return type; }
  public void setType(String type) { this.type = type; }

  public String getDamage() { return damage; }
  public void setDamage(String damage) { this.damage = damage; }

  public String getProperties() { return properties; }
  public void setProperties(String properties) { this.properties = properties; }

  public String getAc() { return ac; }
  public void setAc(String ac) { this.ac = ac; }

  public String getStrength() { return strength; }
  public void setStrength(String strength) { this.strength = strength; }

  public String getStealth() { return stealth; }
  public void setStealth(String stealth) { this.stealth = stealth; }

  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }

  public String getProvenance() { return provenance; }
  public void setProvenance(String provenance) { this.provenance = provenance; }

  public String getOwner_user_id() { return owner_user_id; }
  public void setOwner_user_id(String owner_user_id) { this.owner_user_id = owner_user_id; }

  public Instant getCreated_at() { return created_at; }
  public void setCreated_at(Instant created_at) { this.created_at = created_at; }
  public Instant getUpdated_at() { return updated_at; }
  public void setUpdated_at(Instant updated_at) { this.updated_at = updated_at; }
}
