package com.pigishentertainment.dndassistant.domain;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class SpellComponent {
  private boolean material;
  private boolean somatic;
  private boolean verbal;
  private java.util.List<String> materials_needed = new java.util.ArrayList<>();
  private String raw = "";

  public SpellComponent() {}

  public boolean isMaterial() { return material; }
  public void setMaterial(boolean material) { this.material = material; }

  public boolean isSomatic() { return somatic; }
  public void setSomatic(boolean somatic) { this.somatic = somatic; }

  public boolean isVerbal() { return verbal; }
  public void setVerbal(boolean verbal) { this.verbal = verbal; }

  public java.util.List<String> getMaterials_needed() { return materials_needed; }
  public void setMaterials_needed(java.util.List<String> materials_needed) {
    this.materials_needed = materials_needed == null ? new java.util.ArrayList<>() : materials_needed;
  }

  public String getRaw() { return raw; }
  public void setRaw(String raw) { this.raw = raw == null ? "" : raw; }
}
