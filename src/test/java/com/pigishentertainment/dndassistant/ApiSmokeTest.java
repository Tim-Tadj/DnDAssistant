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
    // V12 / V13 / V14 tables first (depend on characters / campaigns /
    // parties via FKs) so we don't trip ON DELETE CASCADE ordering.
    jdbc.update("DELETE FROM campaign_characters");
    jdbc.update("DELETE FROM campaign_parties");
    jdbc.update("DELETE FROM campaign_sessions");
    jdbc.update("DELETE FROM campaign_npcs");
    jdbc.update("DELETE FROM encounter_saves");
    jdbc.update("DELETE FROM character_state");
    jdbc.update("DELETE FROM parties");
    jdbc.update("DELETE FROM party_members");
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
    // Use a unique-per-run name so re-runs of this test don't see
    // a pre-existing row from a previous invocation.
    String name = "E2E Imported " + System.nanoTime();
    Map<String, Object> item = new HashMap<>();
    item.put("name", name);
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

    @SuppressWarnings("rawtypes")
    ResponseEntity<Map> r1 = client().postForEntity(
        url("/import"), new HttpEntity<>(body, jsonHeaders()), Map.class);
    assertEquals(HttpStatus.OK, r1.getStatusCode());
    assertEquals(1, ((Number) r1.getBody().get("imported")).intValue());

    // Second import: update (same natural key)
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

  // ---- Phase 8: parties, sessions, npcs, character-state ----

  @Test
  void partyCrudAndOwnership() {
    String token = tokenFor("partyuser");
    Map<String, Object> body = Map.of(
        "name", "QA Party",
        "description", "test",
        "member_ids", List.of());
    ResponseEntity<Map> created = client().postForEntity(
        url("/parties"), new HttpEntity<>(body, auth(token)), Map.class);
    assertEquals(HttpStatus.CREATED, created.getStatusCode());
    String id = (String) created.getBody().get("id");

    ResponseEntity<List> listed = client().exchange(
        url("/parties"), HttpMethod.GET, new HttpEntity<>(auth(token)), List.class);
    assertEquals(HttpStatus.OK, listed.getStatusCode());
    assertTrue(((List<?>) listed.getBody()).size() >= 1);

    client().exchange(
        url("/parties/" + id), HttpMethod.DELETE,
        new HttpEntity<>(auth(token)), Void.class);
  }

  @Test
  void partyRequiresAuth() {
    ResponseEntity<String> r = client().getForEntity(
        url("/parties"), String.class);
    // Spring Security returns 403 for unauthenticated requests to
    // protected endpoints; the controller would otherwise return 400.
    assertEquals(HttpStatus.FORBIDDEN, r.getStatusCode());
  }

  @Test
  void campaignSessionAndNpcCrud() {
    String token = tokenFor("sessionnpcuser");
    // Create a campaign first
    Map<String, Object> cbody = Map.of(
        "name", "Test", "description", "", "setting", "",
        "status", "active", "notes", "");
    ResponseEntity<Map> ccreated = client().postForEntity(
        url("/campaigns"), new HttpEntity<>(cbody, auth(token)), Map.class);
    String cid = (String) ccreated.getBody().get("id");

    // Add a session
    Map<String, Object> sbody = Map.of(
        "session_number", 1,
        "title", "First session",
        "played_on", "2026-06-14",
        "summary", "We met in a tavern.",
        "prep_notes", "Hook: goblins",
        "attendees", List.of("Alice", "Bob"));
    ResponseEntity<Map> screated = client().postForEntity(
        url("/campaigns/" + cid + "/sessions"),
        new HttpEntity<>(sbody, auth(token)), Map.class);
    assertEquals(HttpStatus.CREATED, screated.getStatusCode());

    ResponseEntity<List> slisted = client().exchange(
        url("/campaigns/" + cid + "/sessions"),
        HttpMethod.GET, new HttpEntity<>(auth(token)), List.class);
    assertEquals(HttpStatus.OK, slisted.getStatusCode());
    assertEquals(1, ((List<?>) slisted.getBody()).size());

    // Add an NPC
    Map<String, Object> nbody = new HashMap<>();
    nbody.put("name", "Captain Yara");
    nbody.put("role", "Ally");
    nbody.put("race", "Half-Elf");
    nbody.put("alignment", "CG");
    nbody.put("description", "Captain of the guard.");
    nbody.put("status", "alive");
    nbody.put("location", "Iron Keep");
    nbody.put("monster_id", null);
    nbody.put("notes", "");
    ResponseEntity<Map> ncreated = client().postForEntity(
        url("/campaigns/" + cid + "/npcs"),
        new HttpEntity<>(nbody, auth(token)), Map.class);
    assertEquals(HttpStatus.CREATED, ncreated.getStatusCode());

    // Encounter save
    Map<String, Object> ebody = Map.of(
        "campaign_id", cid,
        "name", "Iron Keep Ambush",
        "monsters", List.of(Map.of("id", 1, "name", "Goblin",
            "count", 3, "xp_each", 50)),
        "party_snapshot_ids", List.of(),
        "difficulty", "Hard",
        "total_xp", 150,
        "played_on", "2026-06-14",
        "notes", "");
    ResponseEntity<Map> ecreated = client().postForEntity(
        url("/encounter-saves"),
        new HttpEntity<>(ebody, auth(token)), Map.class);
    assertEquals(HttpStatus.CREATED, ecreated.getStatusCode());

    ResponseEntity<List> elisted = client().exchange(
        url("/campaigns/" + cid + "/encounters"),
        HttpMethod.GET, new HttpEntity<>(auth(token)), List.class);
    assertEquals(HttpStatus.OK, elisted.getStatusCode());
    assertEquals(1, ((List<?>) elisted.getBody()).size());
  }

  @Test
  void characterStateAutoInitAndPersist() {
    String token = tokenFor("stateuser");
    Map<String, Object> cbody = new HashMap<>();
    cbody.put("name", "State Char");
    cbody.put("race_id", 4);
    cbody.put("class_id", 5);
    cbody.put("level", 3);
    cbody.put("alignment", "N");
    cbody.put("background", "");
    cbody.put("str", 14);
    cbody.put("dex", 12);
    cbody.put("con", 13);
    cbody.put("int_", 10);
    cbody.put("wis", 11);
    cbody.put("cha", 10);
    cbody.put("hp_max", 30);
    cbody.put("ac", 15);
    cbody.put("notes", "");
    ResponseEntity<Map> ccreated = client().postForEntity(
        url("/characters"), new HttpEntity<>(cbody, auth(token)), Map.class);
    String cid = (String) ccreated.getBody().get("id");

    // GET /state should auto-init with current_hp = hp_max = 30
    ResponseEntity<Map> sget = client().exchange(
        url("/characters/" + cid + "/state"),
        HttpMethod.GET, new HttpEntity<>(auth(token)), Map.class);
    assertEquals(HttpStatus.OK, sget.getStatusCode());
    assertEquals(30, ((Number) sget.getBody().get("current_hp")).intValue());

    // PUT updates
    Map<String, Object> update = new HashMap<>();
    update.put("character_id", cid);
    update.put("current_hp", 18);
    update.put("temp_hp", 5);
    update.put("conditions", List.of("Prone"));
    update.put("death_save_successes", 0);
    update.put("death_save_failures", 0);
    update.put("hit_dice_used", 1);
    update.put("last_long_rest", null);
    update.put("last_short_rest", null);
    ResponseEntity<Map> sput = client().exchange(
        url("/characters/" + cid + "/state"), HttpMethod.PUT,
        new HttpEntity<>(update, auth(token)), Map.class);
    assertEquals(HttpStatus.OK, sput.getStatusCode());
    assertEquals(18, ((Number) sput.getBody().get("current_hp")).intValue());

    // Re-GET round-trips
    ResponseEntity<Map> sget2 = client().exchange(
        url("/characters/" + cid + "/state"),
        HttpMethod.GET, new HttpEntity<>(auth(token)), Map.class);
    assertEquals(18, ((Number) sget2.getBody().get("current_hp")).intValue());
    assertEquals(List.of("Prone"), sget2.getBody().get("conditions"));
  }

  // ---- Phase 9: campaign_characters, campaign_parties, global NPCs ----

  @Test
  void campaignCharacterStatePerCampaign() {
    String token = tokenFor("ccuser");

    // Create a character (canonical row, level 1, hp_max 10).
    Map<String, Object> cbody = new HashMap<>();
    cbody.put("name", "PC");
    cbody.put("race_id", 4);
    cbody.put("class_id", 5);
    cbody.put("level", 1);
    cbody.put("alignment", "N");
    cbody.put("background", "");
    cbody.put("str", 14); cbody.put("dex", 12); cbody.put("con", 13);
    cbody.put("int_", 10); cbody.put("wis", 11); cbody.put("cha", 10);
    cbody.put("hp_max", 10); cbody.put("ac", 15); cbody.put("notes", "");
    ResponseEntity<Map> ccreated = client().postForEntity(
        url("/characters"), new HttpEntity<>(cbody, auth(token)), Map.class);
    String charId = (String) ccreated.getBody().get("id");

    // Create a campaign.
    Map<String, Object> campaignBody = Map.of(
        "name", "CC", "description", "", "setting", "",
        "status", "active", "notes", "");
    ResponseEntity<Map> campaignCreated = client().postForEntity(
        url("/campaigns"), new HttpEntity<>(campaignBody, auth(token)), Map.class);
    String campaignId = (String) campaignCreated.getBody().get("id");

    // GET the per-campaign state — should auto-init with the
    // canonical level and hp_max.
    ResponseEntity<Map> get = client().exchange(
        url("/campaigns/" + campaignId + "/characters/" + charId),
        HttpMethod.GET, new HttpEntity<>(auth(token)), Map.class);
    assertEquals(HttpStatus.OK, get.getStatusCode());
    assertEquals(1, ((Number) get.getBody().get("level")).intValue());
    assertEquals(10, ((Number) get.getBody().get("hp_max_override")).intValue());

    // PUT — override to level 5, hp_max 44, add a condition.
    Map<String, Object> put = new HashMap<>();
    put.put("character_id", charId);
    put.put("level", 5);
    put.put("hp_max_override", 44);
    put.put("ac_override", 17);
    put.put("notes", "Takes the Sentinel subclass in this campaign.");
    put.put("conditions", List.of("Blessed"));
    put.put("death_save_successes", 0);
    put.put("death_save_failures", 0);
    put.put("hit_dice_used", 0);
    put.put("last_long_rest", null);
    put.put("last_short_rest", null);
    ResponseEntity<Map> updated = client().exchange(
        url("/campaigns/" + campaignId + "/characters/" + charId),
        HttpMethod.PUT, new HttpEntity<>(put, auth(token)), Map.class);
    assertEquals(HttpStatus.OK, updated.getStatusCode());
    assertEquals(5, ((Number) updated.getBody().get("level")).intValue());
    assertEquals(44, ((Number) updated.getBody().get("hp_max_override")).intValue());

    // Re-GET round-trips
    ResponseEntity<Map> get2 = client().exchange(
        url("/campaigns/" + campaignId + "/characters/" + charId),
        HttpMethod.GET, new HttpEntity<>(auth(token)), Map.class);
    assertEquals(5, ((Number) get2.getBody().get("level")).intValue());
    assertEquals(44, ((Number) get2.getBody().get("hp_max_override")).intValue());
    assertEquals(17, ((Number) get2.getBody().get("ac_override")).intValue());
    assertEquals(List.of("Blessed"), get2.getBody().get("conditions"));

    // Canonical character row is NOT changed.
    ResponseEntity<Map> charGet = client().exchange(
        url("/characters/" + charId), HttpMethod.GET,
        new HttpEntity<>(auth(token)), Map.class);
    assertEquals(1, ((Number) charGet.getBody().get("level")).intValue());
    assertEquals(10, ((Number) charGet.getBody().get("hp_max")).intValue());

    // DELETE removes the per-campaign row only.
    ResponseEntity<Void> del = client().exchange(
        url("/campaigns/" + campaignId + "/characters/" + charId),
        HttpMethod.DELETE, new HttpEntity<>(auth(token)), Void.class);
    assertEquals(HttpStatus.OK, del.getStatusCode());
    ResponseEntity<List> listed = client().exchange(
        url("/campaigns/" + campaignId + "/characters"),
        HttpMethod.GET, new HttpEntity<>(auth(token)), List.class);
    assertEquals(0, ((List<?>) listed.getBody()).size());
  }

  @Test
  void campaignPartyLinkAndUnlink() {
    String token = tokenFor("pluser");

    // Two parties.
    Map<String, Object> p1 = Map.of("name", "Heroes", "description", "", "member_ids", List.of());
    Map<String, Object> p2 = Map.of("name", "Villains", "description", "", "member_ids", List.of());
    ResponseEntity<Map> party1 = client().postForEntity(
        url("/parties"), new HttpEntity<>(p1, auth(token)), Map.class);
    ResponseEntity<Map> party2 = client().postForEntity(
        url("/parties"), new HttpEntity<>(p2, auth(token)), Map.class);
    String party1Id = (String) party1.getBody().get("id");
    String party2Id = (String) party2.getBody().get("id");

    // One campaign.
    Map<String, Object> cbody = Map.of(
        "name", "PL", "description", "", "setting", "",
        "status", "active", "notes", "");
    ResponseEntity<Map> cc = client().postForEntity(
        url("/campaigns"), new HttpEntity<>(cbody, auth(token)), Map.class);
    String cid = (String) cc.getBody().get("id");

    // Link both parties to the campaign.
    Map<String, Object> link1 = Map.of("party_id", party1Id);
    ResponseEntity<Map> l1 = client().postForEntity(
        url("/campaigns/" + cid + "/parties"),
        new HttpEntity<>(link1, auth(token)), Map.class);
    assertEquals(HttpStatus.CREATED, l1.getStatusCode());

    Map<String, Object> link2 = Map.of("party_id", party2Id);
    ResponseEntity<Map> l2 = client().postForEntity(
        url("/campaigns/" + cid + "/parties"),
        new HttpEntity<>(link2, auth(token)), Map.class);
    assertEquals(HttpStatus.CREATED, l2.getStatusCode());

    // GET should return both.
    ResponseEntity<List> listed = client().exchange(
        url("/campaigns/" + cid + "/parties"),
        HttpMethod.GET, new HttpEntity<>(auth(token)), List.class);
    assertEquals(HttpStatus.OK, listed.getStatusCode());
    assertEquals(2, ((List<?>) listed.getBody()).size());

    // Unlink one.
    ResponseEntity<Void> unlinked = client().exchange(
        url("/campaigns/" + cid + "/parties/" + party1Id),
        HttpMethod.DELETE, new HttpEntity<>(auth(token)), Void.class);
    assertEquals(HttpStatus.OK, unlinked.getStatusCode());

    ResponseEntity<List> listed2 = client().exchange(
        url("/campaigns/" + cid + "/parties"),
        HttpMethod.GET, new HttpEntity<>(auth(token)), List.class);
    assertEquals(1, ((List<?>) listed2.getBody()).size());
  }

  @Test
  void globalNpcCrudWithCampaignTags() {
    String token = tokenFor("gnuser");

    // One campaign (so we can tag the NPC against it).
    Map<String, Object> cbody = Map.of(
        "name", "GN", "description", "", "setting", "",
        "status", "active", "notes", "");
    ResponseEntity<Map> cc = client().postForEntity(
        url("/campaigns"), new HttpEntity<>(cbody, auth(token)), Map.class);
    String cid = (String) cc.getBody().get("id");

    // Create a global NPC tagged with the campaign.
    Map<String, Object> nbody = new HashMap<>();
    nbody.put("name", "Brigand Captain");
    nbody.put("role", "Antagonist");
    nbody.put("race", "Human");
    nbody.put("alignment", "LE");
    nbody.put("description", "Leader of the road bandits.");
    nbody.put("status", "alive");
    nbody.put("location", "King's Road");
    nbody.put("monster_id", null);
    nbody.put("notes", "Captured in session 4.");
    nbody.put("campaign_tags", List.of(cid));
    nbody.put("campaign_id", cid);
    ResponseEntity<Map> ncreated = client().postForEntity(
        url("/npcs"), new HttpEntity<>(nbody, auth(token)), Map.class);
    assertEquals(HttpStatus.CREATED, ncreated.getStatusCode());
    String npcId = (String) ncreated.getBody().get("id");

    // GET /npcs returns it.
    ResponseEntity<List> listed = client().exchange(
        url("/npcs"), HttpMethod.GET, new HttpEntity<>(auth(token)), List.class);
    assertEquals(HttpStatus.OK, listed.getStatusCode());
    assertTrue(((List<?>) listed.getBody()).size() >= 1);

    // GET /npcs?campaign=cid filters to NPCs tagged with that campaign.
    ResponseEntity<List> filtered = client().exchange(
        url("/npcs?campaign=" + cid),
        HttpMethod.GET, new HttpEntity<>(auth(token)), List.class);
    assertEquals(HttpStatus.OK, filtered.getStatusCode());
    assertEquals(1, ((List<?>) filtered.getBody()).size());

    // Other user can't see it.
    String otherToken = tokenFor("otherguy");
    ResponseEntity<List> otherListed = client().exchange(
        url("/npcs"), HttpMethod.GET, new HttpEntity<>(auth(otherToken)), List.class);
    assertEquals(0, ((List<?>) otherListed.getBody()).size());

    // DELETE
    ResponseEntity<Void> del = client().exchange(
        url("/npcs/" + npcId), HttpMethod.DELETE,
        new HttpEntity<>(auth(token)), Void.class);
    assertEquals(HttpStatus.NO_CONTENT, del.getStatusCode());
  }
}
