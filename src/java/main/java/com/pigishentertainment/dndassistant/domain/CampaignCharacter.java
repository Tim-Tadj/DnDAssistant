package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Phase 9: per-campaign override of a character.
 *
 * A character row in {@code characters} is the canonical stat block.
 * This row is the per-campaign override layer: the DM can give a
 * character a different level, a different max HP / AC, track their
 * conditions / death saves / hit-dice for that specific campaign,
 * and stash per-campaign notes.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CampaignCharacter {
  @JsonProperty("id")                    private String id;
  @JsonProperty("campaign_id")           private String campaign_id;
  @JsonProperty("character_id")          private String character_id;
  @JsonProperty("level")                 private Integer level;
  @JsonProperty("hp_max_override")       private Integer hp_max_override;
  @JsonProperty("ac_override")           private Integer ac_override;
  @JsonProperty("notes")                 private String notes;
  @JsonProperty("conditions")            private List<String> conditions = new ArrayList<>();
  @JsonProperty("death_save_successes")  private Integer death_save_successes;
  @JsonProperty("death_save_failures")   private Integer death_save_failures;
  @JsonProperty("hit_dice_used")         private Integer hit_dice_used;
  @JsonProperty("last_long_rest")        private Instant last_long_rest;
  @JsonProperty("last_short_rest")       private Instant last_short_rest;
  @JsonProperty("created_at")            private Instant created_at;
  @JsonProperty("updated_at")            private Instant updated_at;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getCampaign_id() { return campaign_id; }
  public void setCampaign_id(String campaign_id) { this.campaign_id = campaign_id; }
  public String getCharacter_id() { return character_id; }
  public void setCharacter_id(String character_id) { this.character_id = character_id; }
  public Integer getLevel() { return level; }
  public void setLevel(Integer level) { this.level = level; }
  public Integer getHp_max_override() { return hp_max_override; }
  public void setHp_max_override(Integer hp_max_override) { this.hp_max_override = hp_max_override; }
  public Integer getAc_override() { return ac_override; }
  public void setAc_override(Integer ac_override) { this.ac_override = ac_override; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public List<String> getConditions() { return conditions; }
  public void setConditions(List<String> conditions) {
    this.conditions = conditions == null ? new ArrayList<>() : conditions;
  }
  public Integer getDeath_save_successes() { return death_save_successes; }
  public void setDeath_save_successes(Integer death_save_successes) { this.death_save_successes = death_save_successes; }
  public Integer getDeath_save_failures() { return death_save_failures; }
  public void setDeath_save_failures(Integer death_save_failures) { this.death_save_failures = death_save_failures; }
  public Integer getHit_dice_used() { return hit_dice_used; }
  public void setHit_dice_used(Integer hit_dice_used) { this.hit_dice_used = hit_dice_used; }
  public Instant getLast_long_rest() { return last_long_rest; }
  public void setLast_long_rest(Instant last_long_rest) { this.last_long_rest = last_long_rest; }
  public Instant getLast_short_rest() { return last_short_rest; }
  public void setLast_short_rest(Instant last_short_rest) { this.last_short_rest = last_short_rest; }
  public Instant getCreated_at() { return created_at; }
  public void setCreated_at(Instant created_at) { this.created_at = created_at; }
  public Instant getUpdated_at() { return updated_at; }
  public void setUpdated_at(Instant updated_at) { this.updated_at = updated_at; }
}
