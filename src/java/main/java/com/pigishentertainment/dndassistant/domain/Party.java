package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Phase 8: a user-owned grouping of characters. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Party {
  @JsonProperty("id")             private String id;
  @JsonProperty("name")           private String name;
  @JsonProperty("description")    private String description;
  @JsonProperty("member_ids")     private List<String> member_ids = new ArrayList<>();
  @JsonProperty("owner_user_id")  private String owner_user_id;
  @JsonProperty("created_at")     private Instant created_at;
  @JsonProperty("updated_at")     private Instant updated_at;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public List<String> getMember_ids() { return member_ids; }
  public void setMember_ids(List<String> member_ids) {
    this.member_ids = member_ids == null ? new ArrayList<>() : member_ids;
  }
  public String getOwner_user_id() { return owner_user_id; }
  public void setOwner_user_id(String owner_user_id) { this.owner_user_id = owner_user_id; }
  public Instant getCreated_at() { return created_at; }
  public void setCreated_at(Instant created_at) { this.created_at = created_at; }
  public Instant getUpdated_at() { return updated_at; }
  public void setUpdated_at(Instant updated_at) { this.updated_at = updated_at; }
}
