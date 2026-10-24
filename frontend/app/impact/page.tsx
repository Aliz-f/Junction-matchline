/**
 * My Team Impact route (FE-06, gate G2) — FE-01 shell only.
 *
 * The route exists, is directly linkable and reload-safe. The screen itself is
 * delivered by FE-06; nothing is fabricated here in the meantime.
 */
import { PageHeading } from "@/components/ui/PageHeading";
import { PlannedSurface } from "@/components/ui/PlannedSurface";

export const metadata = { title: "Impact" };

export default function Page() {
  return (
    <>
      <PageHeading title="My Team Impact" />
      <PlannedSurface
        task="FE-06"
        gate="G2"
        title="Favourite-team impact and standings"
        summary="How each result moved your club: standings position, points, and the matches that mattered. A favourite club prioritises information and never hides other teams' fixtures."
        needs={["GET /impact?team_id", "GET /standings"]}
      />
    </>
  );
}
