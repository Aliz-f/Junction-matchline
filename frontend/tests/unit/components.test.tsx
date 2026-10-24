/**
 * FE-01 component rendering guarantees.
 *
 * The point of these is accessibility and honesty, not markup snapshots: status
 * must be readable as text, provenance must be disclosed, and inert controls
 * must be genuinely disabled rather than merely styled that way.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchStatus } from "@/lib/api/contract";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { CompetitionBadge } from "@/components/ui/CompetitionBadge";
import { DemoAiBadge, SourceBadge, StaleSourceBanner } from "@/components/ui/SourceBadge";
import { NotInFeed } from "@/components/ui/States";

describe("StatusIndicator", () => {
  it("renders a text label for every status, never icon-only", () => {
    for (const status of MatchStatus.options) {
      const { container, unmount } = render(<StatusIndicator status={status} />);
      expect(container.textContent?.trim(), status).not.toBe("");
      unmount();
    }
  });

  it("names the status in readable text", () => {
    render(<StatusIndicator status="HALFTIME" />);
    expect(screen.getByText("Half-time")).toBeInTheDocument();
  });

  it("exposes the status in a data attribute for styling and tests", () => {
    const { container } = render(<StatusIndicator status="LIVE" />);
    expect(container.querySelector('[data-status="LIVE"]')).not.toBeNull();
  });

  it("shows an unrecognised status as unknown rather than scheduled", () => {
    render(<StatusIndicator status="WAT" />);
    expect(screen.getByText("Status unknown")).toBeInTheDocument();
    expect(screen.queryByText("Scheduled")).toBeNull();
  });
});

describe("CompetitionBadge", () => {
  it("labels the known competition", () => {
    render(<CompetitionBadge brandKey="pl_demo" />);
    expect(screen.getByText("Premier League")).toBeInTheDocument();
  });

  it("falls back to a neutral label for an unknown competition", () => {
    const { container } = render(<CompetitionBadge brandKey="mystery_cup" />);
    expect(container.querySelector('[data-competition="neutral"]')).not.toBeNull();
  });

  it("prefers a backend-supplied display name when present", () => {
    render(<CompetitionBadge brandKey="pl_demo" name="Premier League demo" />);
    expect(screen.getByText("Premier League demo")).toBeInTheDocument();
  });
});

describe("provenance disclosure", () => {
  it("labels synthetic data as DEMO DATA", () => {
    render(<SourceBadge kind="DEMO_SYNTHETIC" />);
    expect(screen.getByText("DEMO DATA")).toBeInTheDocument();
  });

  it("labels scripted AI as DEMO AI", () => {
    render(<DemoAiBadge />);
    expect(screen.getByText("DEMO AI")).toBeInTheDocument();
  });

  it("warns when a source is stale, and says when it last synced", () => {
    render(<StaleSourceBanner lastSyncedAt="2026-10-24T12:00:00Z" />);
    expect(screen.getByRole("status").textContent).toContain("out of date");
    expect(screen.getByRole("status").textContent).toContain("13:00");
  });

  it("says plainly when a feed never synced, instead of implying freshness", () => {
    render(<StaleSourceBanner lastSyncedAt={null} />);
    expect(screen.getByRole("status").textContent).toContain("never reported a successful sync");
  });
});

describe("NotInFeed", () => {
  it("states data is unavailable rather than inventing analysis", () => {
    render(<NotInFeed what="Player-level statistics are not provided for this match." />);
    expect(screen.getByText("Not available in this feed.")).toBeInTheDocument();
  });
});
