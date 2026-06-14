package com.pigishentertainment.dndassistant.web;

import com.pigishentertainment.dndassistant.data.ClassRepository;
import com.pigishentertainment.dndassistant.data.RaceRepository;
import com.pigishentertainment.dndassistant.domain.DndClass;
import com.pigishentertainment.dndassistant.domain.Race;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.NoSuchElementException;

/** Phase 4: read-mostly reference data for the character editor. */
@RestController
@RequestMapping("/api/v1")
public class ReferenceDataController {

  private final ClassRepository classes;
  private final RaceRepository races;

  public ReferenceDataController(ClassRepository classes, RaceRepository races) {
    this.classes = classes;
    this.races = races;
  }

  @GetMapping("/classes")
  public List<DndClass> listClasses() {
    return classes.findAll();
  }

  @GetMapping("/classes/{id}")
  public DndClass getClass(@PathVariable long id) {
    return classes.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Class " + id + " not found"));
  }

  @GetMapping("/races")
  public List<Race> listRaces() {
    return races.findAll();
  }

  @GetMapping("/races/{id}")
  public Race getRace(@PathVariable long id) {
    return races.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Race " + id + " not found"));
  }
}
