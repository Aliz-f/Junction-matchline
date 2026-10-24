/**
 * Stadium map route (FE-05, gate G2) — FE-01 shell only.
 *
 * The route exists, is directly linkable and reload-safe. The screen itself is
 * delivered by FE-05; nothing is fabricated here in the meantime.
 */
import { PageHeading } from "@/components/ui/PageHeading";
import { PlannedSurface } from "@/components/ui/PlannedSurface";

export const metadata = { title: "Map" };

export default function Page() {
  return (
    <>
      <PageHeading title="Stadium map" />
      <PlannedSurface
        task="FE-05"
        gate="G2"
        title="England stadium discovery"
        summary="An England map of stadiums for the season's fixtures, with verified coordinates only. Fixtures whose venue has no verified location are listed as unmapped rather than being placed at a guessed point."
        needs={["GET /venues", "GET /matches"]}
      />
    </>
  );
}
