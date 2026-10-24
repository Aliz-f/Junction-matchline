/**
 * Journey — the main page (FE-01 shell).
 *
 * `/` is the Journey, never the map. The winding match path with one node per
 * match arrives in FE-03 and needs `GET /journey`, which the frozen BE-00
 * manifest does not yet determine (gaps G1/G2 in FE00_HANDOFF). Until then this
 * route presents the real design system and states what is missing, rather than
 * rendering invented fixtures.
 */
import { PageHeading } from "@/components/ui/PageHeading";
import { PlannedSurface } from "@/components/ui/PlannedSurface";
import { DesignLegend } from "@/components/ui/DesignLegend";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { dataMode } from "@/lib/demo/mode";

export const metadata = { title: "Journey" };

export default function JourneyPage() {
  const mode = dataMode();

  return (
    <>
      <PageHeading
        title="Match Journey"
        description="Your season as a path, one node per match. Competition sets each node's colour and motif; status sets its icon, ring and label."
      >
        {mode === "DEMO_FIXTURES" ? <SourceBadge kind="DEMO_SYNTHETIC" /> : null}
      </PageHeading>

      <div className="space-y-8">
        <PlannedSurface
          task="FE-03"
          title="Winding match path"
          summary="A vertical, mobile-first match path centred on your next upcoming fixture, with past and future matches, null-safe scores, an All / League / Cup filter and keyboard-navigable nodes linking to each match."
          needs={["GET /journey?team_id&season", "GET /teams?competition=PL"]}
        />

        <DesignLegend />
      </div>
    </>
  );
}
