package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

/** Phase 5: a user-owned campaign. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Campaign {
  @JsonProperty("id")             private String id;
  @JsonProperty("name")           private String name;
  @JsonProperty("description")     private String description;
  @JsonProperty("setting")        private String setting;
  @JsonProperty("status")         private String status;
  @JsonProperty("notes")          private String notes;
  @JsonProperty("owner_user_id")  private String owner_user_id;
  @JsonProperty("created_at")     private Instant created_at;
  @JsonProperty("updated_at")     private Instant updated_at;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public String getSetting() { return setting; }
  public void setSetting(String setting) { this.setting = setting; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public String getOwner_user_id() { return owner_user_id; }
  public void setOwner_user_id(String owner_user_id) { this.owner_user_id = owner_user_id; }
  public Instant getCreated_at() { return created_at; }
  public void setCreated_at(Instant created_at) { this.created_at = created_at; }
  public Instant getUpdated_at() { return updated_at; }
  public void setUpdated_at(Instant updated_at) { this.updated_at = updated_at; }
}
