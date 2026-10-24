/**
 * Journey — the main page (FE-03).
 *
 * `/` is the Journey, never the map. The path itself is a client component
 * because it depends on the session, the server clock and the viewer's
 * favourite club; the legend below it stays server-rendered.
 */
import { PageHeading } from "@/components/ui/PageHeading";
import { JourneyScreen } from "@/components/journey/JourneyScreen";
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

      <div className="space-y-10">
        <JourneyScreen />

        <details className="rounded-lg border border-line bg-surface-raised p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Status and competition legend
          </summary>
          <div className="mt-4">
            <DesignLegend />
          </div>
        </details>
      </div>
    </>
  );
}
