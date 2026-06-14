package com.pigishentertainment.dndassistant;

import com.pigishentertainment.dndassistant.domain.Monster;
import com.pigishentertainment.dndassistant.domain.Spell;
import com.pigishentertainment.dndassistant.domain.User;
import java.util.HashMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Phase 6: smoke tests covering the main resource endpoints, the
 * auth flow, and ownership enforcement. Runs against the live
 * dev/test Postgres (see src/test/resources/application.properties).
 * Truncates the data tables between tests so the suite is hermetic.
 *
 * Note: this assumes the dev Postgres is up and Flyway has run
 * (i.e. the backend boots cleanly). In CI the same suite runs
 * against a Testcontainers-managed Postgres.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiSmokeTest {

  @LocalServerPort int port;

  @Autowired JdbcTemplate jdbc;

  private RestTemplate rest;

  @BeforeEach
  void clean() {
    jdbc.update("DELETE FROM characters");
    jdbc.update("DELETE FROM campaigns");
    jdbc.update("DELETE FROM monsters WHERE provenance = 'homebrew'");
    jdbc.update("DELETE FROM spells WHERE provenance = 'homebrew'");
    jdbc.update("DELETE FROM gear WHERE provenance = 'homebrew'");
    jdbc.update("DELETE FROM users");
  }

  private String url(String path) {
    return "http://localhost:" + port + "/api/v1" + path;
  }

  private RestTemplate client() {
    if (rest == null) {
      // Default RestTemplate throws on 4xx/5xx; we want to assert on
      // the response status, so use a no-op error handler.
      rest = new RestTemplateBuilder()
          .errorHandler(new org.springframework.web.client.DefaultResponseErrorHandler() {
            @Override
            public boolean hasError(org.springframework.http.client.ClientHttpResponse r) {
              return false;
            }
          })
          .build();
    }
    return rest;
  }

  private HttpHeaders jsonHeaders() {
    HttpHeaders h = new HttpHeaders();
    h.setContentType(MediaType.APPLICATION_JSON);
    return h;
  }

  /** Map.of() is capped at 10 KV pairs; spell payloads exceed that. */
  private static Map<String, Object> spellBody(String name) {
    Map<String, Object> b = new HashMap<>();
    b.put("name", name);
    b.put("level", "1");
    b.put("school", "abjuration");
    b.put("type", "Test");
    b.put("casting_time", "1 action");
    b.put("range", "60 feet");
    b.put("duration", "Instantaneous");
    b.put("ritual", false);
    b.put("description", "x");
    b.put("higher_levels", "");
    b.put("classes", List.of("wizard"));
    b.put("tags", List.of());
    Map<String, Object> components = new HashMap<>();
    components.put("material", false);
    components.put("somatic", false);
    components.put("verbal", false);
    components.put("materials_needed", List.of());
    components.put("raw", "");
    b.put("components", components);
    return b;
  }

  private static Map<String, Object> importMonsterBody() {
    Map<String, Object> item = new HashMap<>();
    item.put("name", "E2E Imported");
    item.put("meta", "Tiny");
    item.put("AC", "10");
    item.put("HP", "1");
    item.put("Speed", "5ft.");
    item.put("STR", "1");
    item.put("STR_mod", "(-5)");
    item.put("DEX", "1");
    item.put("DEX_mod", "(-5)");
    item.put("CON", "1");
    item.put("CON_mod", "(-5)");
    item.put("INT", "1");
    item.put("INT_mod", "(-5)");
    item.put("WIS", "1");
    item.put("WIS_mod", "(-5)");
    item.put("CHA", "1");
    item.put("CHA_mod", "(-5)");
    item.put("Senses", "");
    item.put("Languages", "");
    item.put("Challenge", "0");
    item.put("Actions", "");
    item.put("img_url", "");
    Map<String, Object> body = new HashMap<>();
    body.put("kind", "monster");
    body.put("provenance", "derived");
    body.put("items", List.of(item));
    return body;
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> signup(String username) {
    Map<String, Object> body = Map.of(
        "username", username,
        "email", username + "@example.com",
        "password", "correct horse",
        "display_name", username
    );
    ResponseEntity<Map> r = client().postForEntity(
        url("/auth/signup"), new HttpEntity<>(body, jsonHeaders()), Map.class);
    assertEquals(HttpStatus.CREATED, r.getStatusCode());
    return r.getBody();
  }

  private String tokenFor(String username) {
    return (String) signup(username).get("token");
  }

  private HttpHeaders auth(String token) {
    HttpHeaders h = jsonHeaders();
    h.setBearerAuth(token);
    return h;
  }

  // ---------- health / public read ----------

  @Test
  void healthIsPublic() {
    ResponseEntity<String> r = client().getForEntity(url("/health"), String.class);
    assertEquals(HttpStatus.OK, r.getStatusCode());
  }

  @Test
  void spellsPublicList() {
    ResponseEntity<List<Spell>> r = client().exchange(
        url("/spells"), HttpMethod.GET, HttpEntity.EMPTY,
        new ParameterizedTypeReference<List<Spell>>() {});
    assertEquals(HttpStatus.OK, r.getStatusCode());
    assertNotNull(r.getBody());
    assertFalse(r.getBody().isEmpty(), "SRD spell seed should be present");
  }

  @Test
  void monstersPublicList() {
    ResponseEntity<List<Monster>> r = client().exchange(
        url("/monsters"), HttpMethod.GET, HttpEntity.EMPTY,
        new ParameterizedTypeReference<List<Monster>>() {});
    assertEquals(HttpStatus.OK, r.getStatusCode());
    assertNotNull(r.getBody());
    assertFalse(r.getBody().isEmpty(), "Monster Manual seed should be present");
  }

  @Test
  void classesPublicList() {
    ResponseEntity<List<Map<String, Object>>> r = client().exchange(
        url("/classes"), HttpMethod.GET, HttpEntity.EMPTY,
        new ParameterizedTypeReference<List<Map<String, Object>>>() {});
    assertEquals(HttpStatus.OK, r.getStatusCode());
    assertNotNull(r.getBody());
    assertTrue(r.getBody().size() >= 12, "All 12 SRD classes should be seeded");
  }

  // ---------- auth ----------

  @Test
  void signupLoginFlow() {
    signup("alice");
    Map<String, Object> body = Map.of("username", "alice", "password", "correct horse");
    ResponseEntity<Map> r = client().postForEntity(
        url("/auth/login"), new HttpEntity<>(body, jsonHeaders()), Map.class);
    assertEquals(HttpStatus.OK, r.getStatusCode());
    assertNotNull(r.getBody().get("token"));
  }

  @Test
  void duplicateUsernameRejected() {
    signup("alice");
    Map<String, Object> body = Map.of(
        "username", "alice", "password", "different", "email", "x@x", "display_name", "x");
    ResponseEntity<String> r = client().postForEntity(
        url("/auth/signup"), new HttpEntity<>(body, jsonHeaders()), String.class);
    assertEquals(HttpStatus.CONFLICT, r.getStatusCode());
  }

  @Test
  void shortPasswordRejected() {
    Map<String, Object> body = Map.of("username", "alice", "password", "short");
    ResponseEntity<String> r = client().postForEntity(
        url("/auth/signup"), new HttpEntity<>(body, jsonHeaders()), String.class);
    assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
  }

  @Test
  void postSpellRequiresAuth() {
    ResponseEntity<String> r = client().postForEntity(
        url("/spells"), new HttpEntity<>(spellBody("x"), jsonHeaders()), String.class);
    assertEquals(HttpStatus.FORBIDDEN, r.getStatusCode());
  }

  // ---------- ownership ----------

  @Test
  void ownerCanCreateAndListHomebrewSpell() {
    String token = tokenFor("alice");
    ResponseEntity<Spell> created = client().exchange(
        url("/spells"), HttpMethod.POST,
        new HttpEntity<>(spellBody("E2E Spell"), auth(token)),
        Spell.class);
    assertEquals(HttpStatus.CREATED, created.getStatusCode());
    assertNotNull(created.getBody().getId());

    // Alice's GET includes her homebrew + the global SRD
    ResponseEntity<List<Spell>> list = client().exchange(
        url("/spells"), HttpMethod.GET, new HttpEntity<>(auth(token)),
        new ParameterizedTypeReference<List<Spell>>() {});
    assertTrue(list.getBody().stream().anyMatch(s -> s.getName().equals("E2E Spell")));

    // Anonymous GET should not see the homebrew
    ResponseEntity<List<Spell>> anon = client().exchange(
        url("/spells"), HttpMethod.GET, HttpEntity.EMPTY,
        new ParameterizedTypeReference<List<Spell>>() {});
    assertFalse(anon.getBody().stream().anyMatch(s -> s.getName().equals("E2E Spell")));
  }

  @Test
  void srdRowIsReadOnly() {
    String token = tokenFor("alice");
    // Try to PUT an existing SRD spell (Acid Splash, id 1).
    Map<String, Object> body = spellBody("Hacked");
    body.put("level", "9");
    body.put("school", "evocation");
    ResponseEntity<String> r = client().exchange(
        url("/spells/1"), HttpMethod.PUT,
        new HttpEntity<>(body, auth(token)), String.class);
    assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
  }

  @Test
  void crossUserUpdateRejected() {
    String alice = tokenFor("alice");
    String bob = tokenFor("bob");
    Map<String, Object> body = spellBody("Alice's");
    ResponseEntity<Spell> created = client().exchange(
        url("/spells"), HttpMethod.POST,
        new HttpEntity<>(body, auth(alice)), Spell.class);
    long spellId = created.getBody().getId();

    ResponseEntity<String> r = client().exchange(
        url("/spells/" + spellId), HttpMethod.PUT,
        new HttpEntity<>(body, auth(bob)), String.class);
    assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
  }

  // ---------- import / snapshot ----------

  @Test
  void importUpsertsAndIsIdempotent() {
    Map<String, Object> body = importMonsterBody();
    @SuppressWarnings("rawtypes")
    ResponseEntity<Map> r1 = client().postForEntity(
        url("/import"), new HttpEntity<>(body, jsonHeaders()), Map.class);
    assertEquals(HttpStatus.OK, r1.getStatusCode());
    assertEquals(1, ((Number) r1.getBody().get("imported")).intValue());

    // Second import: update
    @SuppressWarnings("rawtypes")
    ResponseEntity<Map> r2 = client().postForEntity(
        url("/import"), new HttpEntity<>(body, jsonHeaders()), Map.class);
    assertEquals(HttpStatus.OK, r2.getStatusCode());
    assertEquals(0, ((Number) r2.getBody().get("imported")).intValue());
    assertEquals(1, ((Number) r2.getBody().get("updated")).intValue());
  }

  @Test
  void snapshotExportsProvenance() {
    ResponseEntity<Map> r = client().getForEntity(
        url("/import/snapshot?kind=monster&provenance=derived"), Map.class);
    assertEquals(HttpStatus.OK, r.getStatusCode());
    assertEquals("monster", r.getBody().get("kind"));
    assertEquals("derived", r.getBody().get("provenance"));
  }
}
