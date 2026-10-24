/**
 * Match details (FE-04) — FE-01 shell only.
 *
 * Direct-linkable and reload-safe, and `?tab=` survives a refresh because the
 * tab is read from the URL rather than client state.
 *
 * Two behaviours are real already: a malformed UUID 404s, and in demo mode an
 * id absent from the frozen manifest 404s too (FE-04 acceptance: "unknown UUID
 * 404"). The populated detail view itself needs `GET /matches/{id}`.
 */
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/PageHeading";
import { PlannedSurface } from "@/components/ui/PlannedSurface";
import { dataMode, type DataMode } from "@/lib/demo/mode";
import { demoFixtureIds } from "@/lib/demo/responses";
import { isUuid } from "@/lib/uuid";

export const metadata = { title: "Match" };

/** The A-spec tab set for a match. An unknown `?tab=` falls back to overview. */
const TABS = ["overview", "discuss", "predict", "impact", "whatif", "events"] as const;
type Tab = (typeof TABS)[number];

function resolveTab(raw: string | string[] | undefined): Tab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return TABS.includes(value as Tab) ? (value as Tab) : "overview";
}

export default async function MatchPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const mode: DataMode = dataMode();
  if (mode === "DEMO_FIXTURES" && !demoFixtureIds().has(id)) notFound();

  const tab = resolveTab((await searchParams).tab);

  return (
    <>
      <PageHeading title="Match details" description={`Requested tab: ${tab}.`} />
      <PlannedSurface
        task="FE-04"
        gate="G1"
        title="Match detail, events and capability-gated tabs"
        summary="Teams, stadium, kick-off in Europe/London, status and score, source label and stale warning, plus Overview / Discuss / Predict / Impact / What-if / Events tabs shown only when the verified match state and feed capabilities allow. Missing provider detail is reported as not available in this feed, never inferred."
        needs={["GET /matches/{id}"]}
      />
    </>
  );
}
