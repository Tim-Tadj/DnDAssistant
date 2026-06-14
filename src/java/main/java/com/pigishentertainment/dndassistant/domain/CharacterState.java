package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Phase 8: in-session runtime state for a character. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CharacterState {
  @JsonProperty("character_id")          private String character_id;
  @JsonProperty("current_hp")            private Integer current_hp;
  @JsonProperty("temp_hp")               private Integer temp_hp;
  @JsonProperty("conditions")            private List<String> conditions = new ArrayList<>();
  @JsonProperty("death_save_successes")  private Integer death_save_successes;
  @JsonProperty("death_save_failures")   private Integer death_save_failures;
  @JsonProperty("hit_dice_used")         private Integer hit_dice_used;
  @JsonProperty("last_long_rest")        private Instant last_long_rest;
  @JsonProperty("last_short_rest")       private Instant last_short_rest;
  @JsonProperty("updated_at")            private Instant updated_at;

  public String getCharacter_id() { return character_id; }
  public void setCharacter_id(String character_id) { this.character_id = character_id; }
  public Integer getCurrent_hp() { return current_hp; }
  public void setCurrent_hp(Integer current_hp) { this.current_hp = current_hp; }
  public Integer getTemp_hp() { return temp_hp; }
  public void setTemp_hp(Integer temp_hp) { this.temp_hp = temp_hp; }
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
  public Instant getUpdated_at() { return updated_at; }
  public void setUpdated_at(Instant updated_at) { this.updated_at = updated_at; }
}
