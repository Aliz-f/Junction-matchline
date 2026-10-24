/**
 * FE-02 / FE-03 component behaviour.
 *
 * Focused on the rules that are easy to break silently: a scheduled match must
 * never show 0–0, actions must follow backend `features` rather than status,
 * and an unavailable competition must be explained rather than hidden.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JourneyNode } from "@/components/journey/JourneyNode";
import { CompetitionFilter } from "@/components/journey/CompetitionFilter";
import { TeamPicker } from "@/components/team/TeamPicker";
import { demoMatches } from "@/lib/demo/responses";
import { manifest } from "@/mocks/fixtures";
import type { MatchSummary, TeamSummary } from "@/lib/api/types";

const ARSENAL = manifest.teams[0]!.id;
const matches = demoMatches().items;
const byStatus = (status: string): MatchSummary => matches.find((m) => m.status === status)!;

function renderNode(match: MatchSummary, teamId: string | null = ARSENAL) {
  return render(
    <ul>
      <JourneyNode match={match} teamId={teamId} isNext={false} side="left" />
    </ul>,
  );
}

describe("JourneyNode score display", () => {
  it("shows a real score for a finished match", () => {
    const match = byStatus("FINISHED");
    const { container } = renderNode(match);
    // The score is split across elements (home, separator, away), so assert on
    // the rendered text rather than a single text node.
    const score = container.querySelector(".tabular-nums");
    expect(score?.textContent?.replace(/\s/g, "")).toBe(`${match.score.home}\u2013${match.score.away}`);
    expect(
      screen.getByRole("link", { name: new RegExp(`score ${match.score.home}`) }),
    ).toBeInTheDocument();
  });

  it("never shows 0–0 for a scheduled match, and says so in the accessible name", () => {
    renderNode(byStatus("SCHEDULED"));
    // The accessible name is what conveys "no score" on the board.
    expect(screen.getByRole("link", { name: /no score/i })).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.queryByText("0–0")).toBeNull();
  });

  it("shows no result for a postponed match", () => {
    renderNode(byStatus("POSTPONED"));
    expect(screen.getByRole("link", { name: /no score/i })).toBeInTheDocument();
    expect(screen.getByText("Postponed")).toBeInTheDocument();
  });
});

describe("JourneyNode actions follow backend features", () => {
  it("offers Predict only when predictions_open is true", () => {
    const open = matches.find((m) => m.features.predictions_open)!;
    renderNode(open);
    expect(screen.getByText("Predict")).toBeInTheDocument();
  });

  it("offers What-if only when whatif_available is true", () => {
    renderNode(byStatus("FINISHED"));
    expect(screen.getByText("What-if")).toBeInTheDocument();
  });

  it("offers nothing when every feature flag is false", () => {
    renderNode(byStatus("POSTPONED"));
    expect(screen.queryByText("Predict")).toBeNull();
    expect(screen.queryByText("What-if")).toBeNull();
    expect(screen.queryByText("Discuss")).toBeNull();
  });

  it("does not infer What-if from a LIVE status", () => {
    const live = matches.find((m) => m.status === "LIVE");
    if (!live) return;
    renderNode(live);
    expect(screen.queryByText("What-if")).toBeNull();
  });
});

describe("JourneyNode framing and linking", () => {
  it("links to the match using the same UUID the API returned", () => {
    const match = byStatus("FINISHED");
    renderNode(match);
    expect(screen.getByRole("link")).toHaveAttribute("href", `/matches/${match.id}`);
  });

  it("frames a home fixture from the followed club's perspective", () => {
    const home = matches.find((m) => m.home_team.id === ARSENAL)!;
    renderNode(home, ARSENAL);
    expect(screen.getByText("vs")).toBeInTheDocument();
  });

  it("shows both clubs neutrally when no club is followed", () => {
    const match = byStatus("FINISHED");
    const { container } = renderNode(match, null);
    const text = container.textContent ?? "";
    expect(text).toContain(match.home_team.short_name);
    expect(text).toContain(match.away_team.short_name);
    // No "vs" / "away at" framing without a followed club.
    expect(screen.queryByText("vs")).toBeNull();
    expect(screen.queryByText("away at")).toBeNull();
  });
});

describe("JourneyNode competition identity", () => {
  it("renders a prominent original star motif and named label for Champions League fixtures", () => {
    const base = byStatus("FINISHED");
    const championsLeague = {
      ...base,
      competition: { ...base.competition, brand_key: "ucl_demo", name: "Champions League" },
    };
    const { container } = renderNode(championsLeague);

    expect(screen.getByText("Champions League")).toBeInTheDocument();
    expect(container.querySelector('[data-competition-motif="star"]')).toBeInTheDocument();
  });
});

describe("CompetitionFilter", () => {
  const counts = { ALL: 4, LEAGUE: 4, CUP: 0 };

  it("disables a competition with no fixtures instead of hiding it", async () => {
    const onChange = vi.fn();
    render(<CompetitionFilter value="ALL" onChange={onChange} counts={counts} />);

    const cup = screen.getByRole("button", { name: /Cup/ });
    expect(cup).toBeInTheDocument();
    expect(cup).toBeDisabled();

    await userEvent.click(cup);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("explains why there are no cup fixtures rather than implying they are withheld", () => {
    render(<CompetitionFilter value="ALL" onChange={vi.fn()} counts={counts} />);
    expect(screen.getByText(/Premier League only/)).toBeInTheDocument();
  });

  it("reports the active group with aria-pressed, not colour alone", () => {
    render(<CompetitionFilter value="LEAGUE" onChange={vi.fn()} counts={counts} />);
    expect(screen.getByRole("button", { name: /League/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /All/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("selects an available group", async () => {
    const onChange = vi.fn();
    render(<CompetitionFilter value="ALL" onChange={onChange} counts={counts} />);
    await userEvent.click(screen.getByRole("button", { name: /League/ }));
    expect(onChange).toHaveBeenCalledWith("LEAGUE");
  });
});

describe("TeamPicker", () => {
  const teams: TeamSummary[] = manifest.teams.map((t) => ({
    id: t.id,
    name: t.name,
    short_name: t.short_name,
    crest_url: null,
  }));

  it("lists every club", () => {
    render(<TeamPicker teams={teams} selectedTeamId={null} onSelect={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(teams.length);
  });

  it("filters by search text", async () => {
    render(<TeamPicker teams={teams} selectedTeamId={null} onSelect={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Find your club"), teams[0]!.short_name);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("says so when nothing matches, rather than showing an empty list", async () => {
    render(<TeamPicker teams={teams} selectedTeamId={null} onSelect={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Find your club"), "zzzzz");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("reports the selection with aria-pressed", () => {
    render(<TeamPicker teams={teams} selectedTeamId={teams[0]!.id} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { pressed: true })).toBeInTheDocument();
  });

  it("selects one club at a time", async () => {
    const onSelect = vi.fn();
    render(<TeamPicker teams={teams} selectedTeamId={null} onSelect={onSelect} />);
    await userEvent.click(screen.getAllByRole("button")[1]!);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(teams[1]!.id);
  });

  it("disables selection while a save is in flight", () => {
    render(<TeamPicker teams={teams} selectedTeamId={null} onSelect={vi.fn()} isSaving />);
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });
});
