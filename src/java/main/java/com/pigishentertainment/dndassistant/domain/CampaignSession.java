package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Phase 8: a single session of a campaign. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CampaignSession {
  @JsonProperty("id")             private String id;
  @JsonProperty("campaign_id")    private String campaign_id;
  @JsonProperty("session_number") private Integer session_number;
  @JsonProperty("title")          private String title;
  @JsonProperty("played_on")      private LocalDate played_on;
  @JsonProperty("summary")        private String summary;
  @JsonProperty("prep_notes")     private String prep_notes;
  @JsonProperty("attendees")      private List<String> attendees = new ArrayList<>();
  @JsonProperty("created_at")     private Instant created_at;
  @JsonProperty("updated_at")     private Instant updated_at;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getCampaign_id() { return campaign_id; }
  public void setCampaign_id(String campaign_id) { this.campaign_id = campaign_id; }
  public Integer getSession_number() { return session_number; }
  public void setSession_number(Integer session_number) { this.session_number = session_number; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public LocalDate getPlayed_on() { return played_on; }
  public void setPlayed_on(LocalDate played_on) { this.played_on = played_on; }
  public String getSummary() { return summary; }
  public void setSummary(String summary) { this.summary = summary; }
  public String getPrep_notes() { return prep_notes; }
  public void setPrep_notes(String prep_notes) { this.prep_notes = prep_notes; }
  public List<String> getAttendees() { return attendees; }
  public void setAttendees(List<String> attendees) {
    this.attendees = attendees == null ? new ArrayList<>() : attendees;
  }
  public Instant getCreated_at() { return created_at; }
  public void setCreated_at(Instant created_at) { this.created_at = created_at; }
  public Instant getUpdated_at() { return updated_at; }
  public void setUpdated_at(Instant updated_at) { this.updated_at = updated_at; }
}
