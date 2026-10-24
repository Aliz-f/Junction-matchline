/**
 * Match details (FE-04).
 *
 * The 404 decisions stay on the server so an unknown match returns a real 404
 * status, not a 200 with an error body: a malformed UUID 404s, and in demo mode
 * an id absent from the frozen manifest 404s.
 *
 * `?tab=` is parsed here and passed down, so a direct link such as
 * `?tab=whatif` works on refresh.
 */
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/PageHeading";
import { MatchDetailScreen } from "@/components/match/MatchDetailScreen";
import { parseTab } from "@/components/match/matchTabs";
import { dataMode } from "@/lib/demo/mode";
import { demoFixtureIds } from "@/lib/demo/responses";
import { isUuid } from "@/lib/uuid";

export const metadata = { title: "Match" };

export default async function MatchPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  if (dataMode() === "DEMO_FIXTURES" && !demoFixtureIds().has(id)) notFound();

  const tab = parseTab((await searchParams).tab);

  return (
    <>
      <PageHeading title="Match details" />
      <MatchDetailScreen matchId={id} requestedTab={tab} />
    </>
  );
}
