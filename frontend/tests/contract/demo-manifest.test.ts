// CT-13 / FE-G0.5: validate the mirrored demo manifest against Appendix A A4.
import { describe, expect, it } from "vitest";
import { manifest } from "@/mocks/fixtures";
import { isUuid } from "./helpers";

const fixtureByKey = new Map(manifest.fixtures.map((fixture) => [fixture.key, fixture]));
const fixture = (key: string) => {
  const found = fixtureByKey.get(key);
  if (!found) throw new Error(`manifest fixture ${key} missing`);
  return found;
};
const SCORELESS = new Set(["SCHEDULED", "POSTPONED", "CANCELLED", "SUSPENDED", "UNKNOWN"]);

describe("demo manifest identity and references", () => {
  const collections = {
    teams: manifest.teams,
    venues: manifest.venues,
    fixtures: manifest.fixtures,
    users: manifest.users,
    rooms: manifest.rooms,
    snapshots: manifest.snapshots,
  };

  it.each(Object.entries(collections))("%s use unique canonical UUIDs", (_, items) => {
    const ids = items.map((item) => item.id);
    expect(ids.every(isUuid)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses globally unique IDs across collections", () => {
    const ids = Object.values(collections).flatMap((items) => items.map((item) => item.id));
    expect(new Set([...ids, manifest.competition.id]).size).toBe(ids.length + 1);
  });

  it("resolves every team, venue, room, user and event reference", () => {
    const teams = new Set(manifest.teams.map((team) => team.id));
    const venues = new Set(manifest.venues.map((venue) => venue.id));
    const fixtures = new Set(manifest.fixtures.map((item) => item.id));
    for (const item of manifest.fixtures) {
      expect(teams.has(item.home_team_id), item.key).toBe(true);
      expect(teams.has(item.away_team_id), item.key).toBe(true);
      expect(item.home_team_id).not.toBe(item.away_team_id);
      if (item.venue_id !== null) expect(venues.has(item.venue_id), item.key).toBe(true);
      for (const event of item.events) {
        if (event.team_id !== null) expect([item.home_team_id, item.away_team_id]).toContain(event.team_id);
      }
    }
    for (const venue of manifest.venues) {
      expect(venue.home_team_ids.every((id) => teams.has(id))).toBe(true);
      expect([...venue.home_team_ids].sort()).toEqual(venue.home_team_ids);
    }
    for (const room of manifest.rooms) expect(fixtures.has(room.match_id)).toBe(true);
    for (const user of manifest.users) {
      if (user.favorite_team_id !== null) expect(teams.has(user.favorite_team_id)).toBe(true);
    }
  });

  it("only marks venues coord_verified with recorded coordinate provenance", () => {
    for (const venue of manifest.venues) {
      if (venue.coord_verified) expect(venue.coord_source).toMatch(/^https:\/\//);
    }
  });
});

describe("fixture integrity (A4)", () => {
  it("has at most one non-cancelled fixture per team per matchday", () => {
    const seen = new Set<string>();
    for (const item of manifest.fixtures.filter((f) => f.status !== "CANCELLED")) {
      for (const team of [item.home_team_id, item.away_team_id]) {
        const key = `${item.matchday}:${team}`;
        expect(seen.has(key), `duplicate ${key}`).toBe(false);
        seen.add(key);
      }
    }
  });

  it("orders kickoffs chronologically with matchday", () => {
    const byMatchday = [...manifest.fixtures].sort((a, b) => a.matchday - b.matchday);
    const kickoffs = byMatchday.map((item) => item.kickoff_at);
    expect(kickoffs).toEqual([...kickoffs].sort());
  });

  it("keeps score nullability consistent with status", () => {
    for (const item of manifest.fixtures) {
      const { home, away } = item.score;
      if (item.status === "FINISHED") expect(home !== null && away !== null, item.key).toBe(true);
      if (SCORELESS.has(item.status)) expect(home === null && away === null, item.key).toBe(true);
    }
  });
});

describe("A4 canonical starter IDs", () => {
  const ARSENAL = "20000000-0000-4000-8000-000000000001";
  const CHELSEA = "20000000-0000-4000-8000-000000000002";
  const SPURS = "20000000-0000-4000-8000-000000000003";

  it("pins competition, clubs and demo clock", () => {
    expect(manifest.competition).toMatchObject({ id: "10000000-0000-4000-8000-000000000001", code: "PL" });
    expect(manifest.competition.season_start_year).toBe(2026);
    const names = Object.fromEntries(manifest.teams.map((team) => [team.id, team.name]));
    expect(names[ARSENAL]).toBe("Arsenal");
    expect(names[CHELSEA]).toBe("Chelsea");
    expect(names[SPURS]).toBe("Spurs");
    expect(manifest.demo_clock).toBe("2026-10-24T12:00:00Z");
  });

  it.each([
    ["match_upcoming", "30000000-0000-4000-8000-000000000001", ARSENAL, SPURS, "2026-11-01T15:00:00Z", "SCHEDULED", 11],
    ["match_live", "30000000-0000-4000-8000-000000000002", CHELSEA, SPURS, "2026-10-24T11:00:00Z", "LIVE", 10],
    ["match_finished", "30000000-0000-4000-8000-000000000003", ARSENAL, CHELSEA, "2026-10-23T19:00:00Z", "FINISHED", 9],
  ])("%s matches the A4 table", (key, id, home, away, kickoff, status, matchday) => {
    expect(fixture(key)).toMatchObject({
      id,
      home_team_id: home,
      away_team_id: away,
      kickoff_at: kickoff,
      status,
      matchday,
    });
  });

  it("gives match_finished a verified synthetic substitution event", () => {
    expect(fixture("match_finished").events.map((event) => event.kind)).toContain("SUB");
  });
});

describe("G0 fixture-coverage freeze (FE-G0.5)", () => {
  it.each([
    ["match_upcoming", "SCHEDULED"],
    ["match_live", "LIVE"],
    ["match_halftime", "HALFTIME"],
    ["match_finished", "FINISHED"],
    ["match_postponed", "POSTPONED"],
    ["match_cancelled", "CANCELLED"],
    ["match_event_poor_finished", "FINISHED"],
    ["match_non_relevant", "SCHEDULED"],
  ])("%s is seeded with status %s", (key, status) => {
    expect(fixture(key).status).toBe(status);
  });

  it("distinguishes event-rich from event-poor FINISHED", () => {
    expect(fixture("match_finished").events.length).toBeGreaterThan(0);
    expect(fixture("match_event_poor_finished").events).toEqual([]);
  });

  it("does not involve the demo favorite in the non-relevant fixture", () => {
    const item = fixture("match_non_relevant");
    const favorites = manifest.users.map((user) => user.favorite_team_id);
    expect(favorites).not.toContain(item.home_team_id);
    expect(favorites).not.toContain(item.away_team_id);
  });

  it("seeds at least five extra historical FINISHED fixtures", () => {
    const history = manifest.fixtures.filter((item) => item.key.startsWith("history_"));
    expect(history.length).toBeGreaterThanOrEqual(5);
    expect(history.every((item) => item.status === "FINISHED")).toBe(true);
    expect(history.every((item) => item.kickoff_at < manifest.demo_clock)).toBe(true);
  });
});

describe("named scenarios and badge corpus (A3b item 8, A4)", () => {
  const snapshots = new Map(manifest.snapshots.map((snapshot) => [snapshot.key, snapshot.id]));

  it.each([
    ["baseline", "2026-10-24T12:00:00Z", { match_live: "LIVE", match_upcoming: "SCHEDULED", match_finished: "FINISHED" }],
    ["upcoming_live", "2026-11-01T15:15:00Z", { match_live: "FINISHED", match_upcoming: "LIVE", match_finished: "FINISHED" }],
    [
      "upcoming_finished",
      "2026-11-01T17:30:00Z",
      { match_live: "FINISHED", match_upcoming: "FINISHED", match_finished: "FINISHED" },
    ],
  ] as const)("%s sets clock, snapshot and explicit fixture states", (name, clock, statuses) => {
    const scenario = manifest.scenarios[name];
    expect(scenario.server_now_utc).toBe(clock);
    expect(scenario.snapshot_id).toBe(snapshots.get(name));
    for (const [key, state] of Object.entries(scenario.fixture_states)) {
      expect(fixtureByKey.has(key), key).toBe(true);
      const { home, away } = state.score;
      if (state.status === "FINISHED") expect(home !== null && away !== null).toBe(true);
      if (SCORELESS.has(state.status)) expect(home === null && away === null).toBe(true);
    }
    expect(Object.fromEntries(Object.entries(scenario.fixture_states).map(([k, s]) => [k, s.status]))).toEqual(
      statuses,
    );
  });

  it("baseline fixture states equal the seeded fixtures", () => {
    for (const [key, state] of Object.entries(manifest.scenarios.baseline.fixture_states)) {
      expect({ status: fixture(key).status, score: fixture(key).score }).toEqual(state);
    }
    expect(manifest.scenarios.baseline.server_now_utc).toBe(manifest.demo_clock);
  });

  it("seeds FREE and PREMIUM accounts with the A3b badge baselines", () => {
    expect(manifest.users.map((user) => user.plan).sort()).toEqual(["FREE", "PREMIUM"]);
    const { free, premium } = manifest.prediction_baselines;
    expect([free.scored_count, free.correct_outcomes]).toEqual([4, 2]);
    expect([premium.scored_count, premium.correct_outcomes, premium.predictor_bronze]).toEqual([5, 3, true]);
    expect(free.expected_after_settlement).toEqual({ scored_count: 5, correct_outcomes: 3, predictor_bronze: true });
  });

  it("makes the FREE pending prediction correct under upcoming_finished", () => {
    const { free } = manifest.prediction_baselines;
    expect(free.pending_match_id).toBe(fixture("match_upcoming").id);
    const { home, away } = manifest.scenarios.upcoming_finished.fixture_states.match_upcoming?.score ?? {};
    expect(home).not.toBeNull();
    expect(away).not.toBeNull();
    const outcome = home! > away! ? "HOME" : home === away ? "DRAW" : "AWAY";
    expect(outcome).toBe(free.pending_outcome);
  });
});
