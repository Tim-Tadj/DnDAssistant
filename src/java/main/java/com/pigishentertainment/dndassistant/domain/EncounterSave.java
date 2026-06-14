package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Phase 8: a snapshot of an encounter the DM has run. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EncounterSave {
  @JsonProperty("id")                   private String id;
  @JsonProperty("owner_user_id")        private String owner_user_id;
  @JsonProperty("campaign_id")          private String campaign_id;
  @JsonProperty("name")                  private String name;
  @JsonProperty("monsters")             private List<MonsterRef> monsters = new ArrayList<>();
  @JsonProperty("party_snapshot_ids")   private List<String> party_snapshot_ids = new ArrayList<>();
  @JsonProperty("difficulty")            private String difficulty;
  @JsonProperty("total_xp")              private Integer total_xp;
  @JsonProperty("played_on")            private LocalDate played_on;
  @JsonProperty("notes")                 private String notes;
  @JsonProperty("created_at")            private Instant created_at;
  @JsonProperty("updated_at")            private Instant updated_at;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getOwner_user_id() { return owner_user_id; }
  public void setOwner_user_id(String owner_user_id) { this.owner_user_id = owner_user_id; }
  public String getCampaign_id() { return campaign_id; }
  public void setCampaign_id(String campaign_id) { this.campaign_id = campaign_id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public List<MonsterRef> getMonsters() { return monsters; }
  public void setMonsters(List<MonsterRef> monsters) { this.monsters = monsters == null ? new ArrayList<>() : monsters; }
  public List<String> getParty_snapshot_ids() { return party_snapshot_ids; }
  public void setParty_snapshot_ids(List<String> party_snapshot_ids) {
    this.party_snapshot_ids = party_snapshot_ids == null ? new ArrayList<>() : party_snapshot_ids;
  }
  public String getDifficulty() { return difficulty; }
  public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
  public Integer getTotal_xp() { return total_xp; }
  public void setTotal_xp(Integer total_xp) { this.total_xp = total_xp; }
  public LocalDate getPlayed_on() { return played_on; }
  public void setPlayed_on(LocalDate played_on) { this.played_on = played_on; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public Instant getCreated_at() { return created_at; }
  public void setCreated_at(Instant created_at) { this.created_at = created_at; }
  public Instant getUpdated_at() { return updated_at; }
  public void setUpdated_at(Instant updated_at) { this.updated_at = updated_at; }

  /** Lightweight monster reference: just the id, name, count, xp. */
  @JsonInclude(JsonInclude.Include.NON_NULL)
  public static class MonsterRef {
    @JsonProperty("id")          private Long id;
    @JsonProperty("name")        private String name;
    @JsonProperty("count")       private Integer count;
    @JsonProperty("xp_each")     private Integer xp_each;
    public MonsterRef() {}
    public MonsterRef(Long id, String name, Integer count, Integer xp_each) {
      this.id = id; this.name = name; this.count = count; this.xp_each = xp_each;
    }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getCount() { return count; }
    public void setCount(Integer count) { this.count = count; }
    public Integer getXp_each() { return xp_each; }
    public void setXp_each(Integer xp_each) { this.xp_each = xp_each; }
  }
}
