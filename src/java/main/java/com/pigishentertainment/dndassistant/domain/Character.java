package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

/** Phase 4: a player character. Owned by a user. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Character {
  @JsonProperty("id")             private String id;
  @JsonProperty("name")           private String name;
  @JsonProperty("race_id")        private Long raceId;
  @JsonProperty("class_id")       private Long classId;
  @JsonProperty("level")          private Integer level;
  @JsonProperty("alignment")      private String alignment;
  @JsonProperty("background")     private String background;
  @JsonProperty("str")            private Integer str;
  @JsonProperty("dex")            private Integer dex;
  @JsonProperty("con")            private Integer con;
  @JsonProperty("int_")           private Integer int_;
  @JsonProperty("wis")            private Integer wis;
  @JsonProperty("cha")            private Integer cha;
  @JsonProperty("hp_max")         private Integer hp_max;
  @JsonProperty("ac")             private Integer ac;
  @JsonProperty("notes")          private String notes;
  @JsonProperty("owner_user_id")  private String owner_user_id;
  @JsonProperty("created_at")     private Instant created_at;
  @JsonProperty("updated_at")     private Instant updated_at;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public Long getRaceId() { return raceId; }
  public void setRaceId(Long raceId) { this.raceId = raceId; }
  public Long getClassId() { return classId; }
  public void setClassId(Long classId) { this.classId = classId; }
  public Integer getLevel() { return level; }
  public void setLevel(Integer level) { this.level = level; }
  public String getAlignment() { return alignment; }
  public void setAlignment(String alignment) { this.alignment = alignment; }
  public String getBackground() { return background; }
  public void setBackground(String background) { this.background = background; }
  public Integer getStr() { return str; }
  public void setStr(Integer str) { this.str = str; }
  public Integer getDex() { return dex; }
  public void setDex(Integer dex) { this.dex = dex; }
  public Integer getCon() { return con; }
  public void setCon(Integer con) { this.con = con; }
  public Integer getInt() { return int_; }
  public void setInt(Integer int_) { this.int_ = int_; }
  public Integer getWis() { return wis; }
  public void setWis(Integer wis) { this.wis = wis; }
  public Integer getCha() { return cha; }
  public void setCha(Integer cha) { this.cha = cha; }
  public Integer getHpMax() { return hp_max; }
  public void setHpMax(Integer hp_max) { this.hp_max = hp_max; }
  public Integer getAc() { return ac; }
  public void setAc(Integer ac) { this.ac = ac; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public String getOwner_user_id() { return owner_user_id; }
  public void setOwner_user_id(String owner_user_id) { this.owner_user_id = owner_user_id; }
  public Instant getCreated_at() { return created_at; }
  public void setCreated_at(Instant created_at) { this.created_at = created_at; }
  public Instant getUpdated_at() { return updated_at; }
  public void setUpdated_at(Instant updated_at) { this.updated_at = updated_at; }
}
