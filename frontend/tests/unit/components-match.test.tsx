/**
 * FE-04 match rendering.
 *
 * Covers the defensive-rendering requirements: no fabricated score, an explicit
 * warning on an abandoned fixture, unknown event minutes shown as unknown, and
 * missing provider data reported as missing rather than estimated.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchHeader } from "@/components/match/MatchHeader";
import { EventTimeline } from "@/components/match/EventTimeline";
import { demoMatchDetail, demoMatches } from "@/lib/demo/responses";
import type { MatchDetail } from "@/lib/api/types";

const details = demoMatches()
  .items.map((m) => demoMatchDetail(m.id))
  .filter((d): d is MatchDetail => d !== null);

const byStatus = (status: string): MatchDetail | undefined => details.find((d) => d.status === status);

describe("MatchHeader score", () => {
  it("shows the confirmed score for a finished match", () => {
    const match = byStatus("FINISHED")!;
    const { container } = render(<MatchHeader match={match} />);
    const score = container.querySelector(".tabular-nums");
    expect(score?.textContent?.replace(/\s/g, "")).toBe(
      `${match.score.home}–${match.score.away}`,
    );
  });

  it("says 'Not started' instead of 0–0 for a scheduled match", () => {
    render(<MatchHeader match={byStatus("SCHEDULED")!} />);
    expect(screen.getByText("Not started")).toBeInTheDocument();
  });

  it("warns that a postponed match has no result", () => {
    const match = byStatus("POSTPONED");
    if (!match) return;
    render(<MatchHeader match={match} />);
    expect(screen.getByText("No result")).toBeInTheDocument();
    expect(screen.getByRole("status").textContent).toMatch(/postponed/i);
  });

  it("flags that a live score may still change", () => {
    const match = byStatus("LIVE") ?? byStatus("HALFTIME");
    if (!match) return;
    render(<MatchHeader match={match} />);
    expect(screen.getByText("Score may change")).toBeInTheDocument();
  });
});

describe("MatchHeader metadata", () => {
  it("shows kick-off in football-local time with its zone", () => {
    const match = byStatus("FINISHED")!;
    const { container } = render(<MatchHeader match={match} />);
    expect(container.textContent).toMatch(/GMT|BST/);
  });

  it("labels both clubs home and away", () => {
    render(<MatchHeader match={byStatus("FINISHED")!} />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Away")).toBeInTheDocument();
  });

  it("discloses the data source and its version", () => {
    const match = byStatus("FINISHED")!;
    const { container } = render(<MatchHeader match={match} />);
    expect(screen.getByText("DEMO DATA")).toBeInTheDocument();
    expect(container.textContent).toContain(match.source.data_version);
  });

  it("says the location is unavailable rather than guessing a venue", () => {
    const match = byStatus("FINISHED")!;
    const withoutVenue: MatchDetail = { ...match, venue: null };
    render(<MatchHeader match={withoutVenue} />);
    expect(screen.getByText("Location unavailable")).toBeInTheDocument();
  });

  it("falls back to initials when a club has no crest", () => {
    const match = byStatus("FINISHED")!;
    expect(match.home_team.crest_url).toBeNull();
    const { container } = render(<MatchHeader match={match} />);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("EventTimeline", () => {
  it("lists events for a feed that provides them", () => {
    const match = details.find((d) => d.events.length > 0)!;
    const { container } = render(<EventTimeline match={match} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(match.events.length);
    expect(container.textContent).toContain(match.events[0]!.source_ref);
  });

  it("reports that a feed without event support provides none", () => {
    const match = details.find((d) => !d.data_capabilities.events);
    if (!match) return;
    render(<EventTimeline match={match} />);
    expect(screen.getByText("Not available in this feed.")).toBeInTheDocument();
  });

  it("distinguishes a supported-but-empty timeline from an unsupported one", () => {
    const match = details.find((d) => d.data_capabilities.events)!;
    const emptied: MatchDetail = { ...match, events: [] };
    render(<EventTimeline match={emptied} />);
    expect(screen.getByText(/none were\s+reported/)).toBeInTheDocument();
    expect(screen.queryByText("Not available in this feed.")).toBeNull();
  });

  it("shows an unknown minute as unknown rather than minute zero", () => {
    const match = details.find((d) => d.events.length > 0)!;
    const unknownMinute: MatchDetail = {
      ...match,
      events: [{ ...match.events[0]!, minute: null }],
    };
    render(<EventTimeline match={unknownMinute} />);
    expect(screen.getByLabelText("Minute unknown")).toBeInTheDocument();
    expect(screen.queryByText("0'")).toBeNull();
  });

  it("orders known minutes ascending and puts unknown minutes last", () => {
    const match = details.find((d) => d.events.length > 0)!;
    const base = match.events[0]!;
    const mixed: MatchDetail = {
      ...match,
      events: [
        { ...base, id: "80000000-0000-4000-8000-00000000000a", minute: null },
        { ...base, id: "80000000-0000-4000-8000-00000000000b", minute: 70 },
        { ...base, id: "80000000-0000-4000-8000-00000000000c", minute: 10 },
      ],
    };
    render(<EventTimeline match={mixed} />);
    const minutes = screen.getAllByRole("listitem").map((li) => li.textContent?.slice(0, 4) ?? "");
    expect(minutes[0]).toContain("10");
    expect(minutes[1]).toContain("70");
    expect(minutes[2]).toContain("—");
  });
});
