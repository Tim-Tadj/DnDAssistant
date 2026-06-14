package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

/**
 * Phase 5: A user account. {@code id} is a UUID string and is what gets
 * recorded in the {@code owner_user_id} columns on spells/monsters/gear
 * (and eventually campaigns/characters).
 */
public class User {
  @JsonProperty("id")             private String id;
  @JsonProperty("username")       private String username;
  @JsonProperty("email")          private String email;
  @JsonProperty("display_name")   private String display_name;
  @JsonProperty("created_at")     private Instant created_at;
  @JsonProperty("updated_at")     private Instant updated_at;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }

  public String getUsername() { return username; }
  public void setUsername(String username) { this.username = username; }

  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }

  public String getDisplayName() { return display_name; }
  public void setDisplayName(String display_name) { this.display_name = display_name; }

  public Instant getCreatedAt() { return created_at; }
  public void setCreatedAt(Instant created_at) { this.created_at = created_at; }
  public Instant getUpdatedAt() { return updated_at; }
  public void setUpdatedAt(Instant updated_at) { this.updated_at = updated_at; }
}
