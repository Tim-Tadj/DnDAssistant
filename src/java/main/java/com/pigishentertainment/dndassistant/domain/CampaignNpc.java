package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Phase 8: a named NPC. In Phase 9 the NPC is global (per-user) and
 * tagged with the campaigns it appears in. {@code campaign_id} is
 * retained as a "primary" campaign for back-compat with the V8
 * client and with existing rows, but new reads / writes should
 * prefer {@code campaign_tags}.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CampaignNpc {
  @JsonProperty("id")             private String id;
  @JsonProperty("campaign_id")    private String campaign_id;
  @JsonProperty("owner_user_id")  private String owner_user_id;
  @JsonProperty("name")           private String name;
  @JsonProperty("role")           private String role;
  @JsonProperty("race")           private String race;
  @JsonProperty("alignment")      private String alignment;
  @JsonProperty("description")    private String description;
  @JsonProperty("status")         private String status;
  @JsonProperty("location")       private String location;
  @JsonProperty("monster_id")     private Long monster_id;
  @JsonProperty("notes")          private String notes;
  @JsonProperty("campaign_tags")  private List<String> campaign_tags = new ArrayList<>();
  @JsonProperty("created_at")     private Instant created_at;
  @JsonProperty("updated_at")     private Instant updated_at;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getCampaign_id() { return campaign_id; }
  public void setCampaign_id(String campaign_id) { this.campaign_id = campaign_id; }
  public String getOwner_user_id() { return owner_user_id; }
  public void setOwner_user_id(String owner_user_id) { this.owner_user_id = owner_user_id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getRole() { return role; }
  public void setRole(String role) { this.role = role; }
  public String getRace() { return race; }
  public void setRace(String race) { this.race = race; }
  public String getAlignment() { return alignment; }
  public void setAlignment(String alignment) { this.alignment = alignment; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getLocation() { return location; }
  public void setLocation(String location) { this.location = location; }
  public Long getMonster_id() { return monster_id; }
  public void setMonster_id(Long monster_id) { this.monster_id = monster_id; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public List<String> getCampaign_tags() { return campaign_tags; }
  public void setCampaign_tags(List<String> campaign_tags) {
    this.campaign_tags = campaign_tags == null ? new ArrayList<>() : campaign_tags;
  }
  public Instant getCreated_at() { return created_at; }
  public void setCreated_at(Instant created_at) { this.created_at = created_at; }
  public Instant getUpdated_at() { return updated_at; }
  public void setUpdated_at(Instant updated_at) { this.updated_at = updated_at; }
}
