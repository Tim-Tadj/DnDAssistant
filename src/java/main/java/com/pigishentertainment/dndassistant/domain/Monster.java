package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

/**
 * Mirrors the bundled JSON shape in
 * {@code src/res/resources/monster_manual_monsters.json} (and the
 * frontend {@code Monster} type). Field names use PascalCase on the wire
 * (AC, HP, Speed, INT, ...) and snake_case for the multi-word fields
 * (Saving_Throws, Legendary_Actions, ...). DB columns are lowercase with
 * trailing underscores; the repository maps between them.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Monster {
  private Long id;

  @JsonProperty("name")    private String name;
  @JsonProperty("meta")    private String meta;
  @JsonProperty("AC")      private String ac;
  @JsonProperty("HP")      private String hp;
  @JsonProperty("Speed")   private String speed;

  @JsonProperty("STR")       private String str;
  @JsonProperty("STR_mod")   private String str_mod;
  @JsonProperty("DEX")       private String dex;
  @JsonProperty("DEX_mod")   private String dex_mod;
  @JsonProperty("CON")       private String con;
  @JsonProperty("CON_mod")   private String con_mod;
  @JsonProperty("INT")       private String intValue;
  @JsonProperty("INT_mod")   private String int_mod;
  @JsonProperty("WIS")       private String wis;
  @JsonProperty("WIS_mod")   private String wis_mod;
  @JsonProperty("CHA")       private String cha;
  @JsonProperty("CHA_mod")   private String cha_mod;

  @JsonProperty("Saving_Throws")         private String saving_throws;
  @JsonProperty("Skills")                private String skills;
  @JsonProperty("Damage_Vulnerabilities") private String damage_vulnerabilities;
  @JsonProperty("Damage_Resistances")    private String damage_resistances;
  @JsonProperty("Damage_Immunities")     private String damage_immunities;
  @JsonProperty("Condition_Immunities")  private String condition_immunities;
  @JsonProperty("Senses")                private String senses;
  @JsonProperty("Languages")             private String languages;
  @JsonProperty("Challenge")             private String challenge;

  @JsonProperty("Traits")            private String traits;
  @JsonProperty("Actions")           private String actions;
  @JsonProperty("Reactions")         private String reactions;
  @JsonProperty("Legendary_Actions") private String legendary_actions;
  @JsonProperty("description")       private String description;
  @JsonProperty("Lair_Actions")      private String lair_actions;
  @JsonProperty("Regional_Effects")  private String regional_effects;
  @JsonProperty("img_url")           private String img_url;

  @JsonProperty("provenance")    private String provenance = "homebrew";
  @JsonProperty("owner_user_id") private String owner_user_id;
  @JsonProperty("created_at")    private Instant created_at;
  @JsonProperty("updated_at")    private Instant updated_at;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }

  public String getMeta() { return meta; }
  public void setMeta(String meta) { this.meta = meta; }

  public String getAc() { return ac; }
  public void setAc(String ac) { this.ac = ac; }

  public String getHp() { return hp; }
  public void setHp(String hp) { this.hp = hp; }

  public String getSpeed() { return speed; }
  public void setSpeed(String speed) { this.speed = speed; }

  public String getStr() { return str; }
  public void setStr(String str) { this.str = str; }
  public String getStr_mod() { return str_mod; }
  public void setStr_mod(String str_mod) { this.str_mod = str_mod; }

  public String getDex() { return dex; }
  public void setDex(String dex) { this.dex = dex; }
  public String getDex_mod() { return dex_mod; }
  public void setDex_mod(String dex_mod) { this.dex_mod = dex_mod; }

  public String getCon() { return con; }
  public void setCon(String con) { this.con = con; }
  public String getCon_mod() { return con_mod; }
  public void setCon_mod(String con_mod) { this.con_mod = con_mod; }

  public String getInt_() { return intValue; }
  public void setInt_(String intValue) { this.intValue = intValue; }
  public String getInt_mod() { return int_mod; }
  public void setInt_mod(String int_mod) { this.int_mod = int_mod; }

  public String getWis() { return wis; }
  public void setWis(String wis) { this.wis = wis; }
  public String getWis_mod() { return wis_mod; }
  public void setWis_mod(String wis_mod) { this.wis_mod = wis_mod; }

  public String getCha() { return cha; }
  public void setCha(String cha) { this.cha = cha; }
  public String getCha_mod() { return cha_mod; }
  public void setCha_mod(String cha_mod) { this.cha_mod = cha_mod; }

  public String getSaving_throws() { return saving_throws; }
  public void setSaving_throws(String saving_throws) { this.saving_throws = saving_throws; }
  public String getSkills() { return skills; }
  public void setSkills(String skills) { this.skills = skills; }
  public String getDamage_vulnerabilities() { return damage_vulnerabilities; }
  public void setDamage_vulnerabilities(String v) { this.damage_vulnerabilities = v; }
  public String getDamage_resistances() { return damage_resistances; }
  public void setDamage_resistances(String v) { this.damage_resistances = v; }
  public String getDamage_immunities() { return damage_immunities; }
  public void setDamage_immunities(String v) { this.damage_immunities = v; }
  public String getCondition_immunities() { return condition_immunities; }
  public void setCondition_immunities(String v) { this.condition_immunities = v; }
  public String getSenses() { return senses; }
  public void setSenses(String senses) { this.senses = senses; }
  public String getLanguages() { return languages; }
  public void setLanguages(String languages) { this.languages = languages; }
  public String getChallenge() { return challenge; }
  public void setChallenge(String challenge) { this.challenge = challenge; }

  public String getTraits() { return traits; }
  public void setTraits(String traits) { this.traits = traits; }
  public String getActions() { return actions; }
  public void setActions(String actions) { this.actions = actions; }
  public String getReactions() { return reactions; }
  public void setReactions(String reactions) { this.reactions = reactions; }
  public String getLegendary_actions() { return legendary_actions; }
  public void setLegendary_actions(String v) { this.legendary_actions = v; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public String getLair_actions() { return lair_actions; }
  public void setLair_actions(String v) { this.lair_actions = v; }
  public String getRegional_effects() { return regional_effects; }
  public void setRegional_effects(String v) { this.regional_effects = v; }
  public String getImg_url() { return img_url; }
  public void setImg_url(String img_url) { this.img_url = img_url; }

  public String getProvenance() { return provenance; }
  public void setProvenance(String provenance) { this.provenance = provenance; }

  public String getOwner_user_id() { return owner_user_id; }
  public void setOwner_user_id(String owner_user_id) { this.owner_user_id = owner_user_id; }

  public Instant getCreated_at() { return created_at; }
  public void setCreated_at(Instant created_at) { this.created_at = created_at; }
  public Instant getUpdated_at() { return updated_at; }
  public void setUpdated_at(Instant updated_at) { this.updated_at = updated_at; }
}
