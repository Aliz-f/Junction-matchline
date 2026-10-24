/**
 * Community rooms route (FE-07, gate G2) — FE-01 shell only.
 *
 * The route exists, is directly linkable and reload-safe. The screen itself is
 * delivered by FE-07; nothing is fabricated here in the meantime.
 */
import { PageHeading } from "@/components/ui/PageHeading";
import { PlannedSurface } from "@/components/ui/PlannedSurface";

export const metadata = { title: "Community" };

export default function Page() {
  return (
    <>
      <PageHeading title="Community rooms" />
      <PlannedSurface
        task="FE-07"
        gate="G2"
        title="Community rooms"
        summary="Per-match discussion rooms. Free accounts can post in existing rooms; premium accounts can create them. Permissions, cutoffs and moderation are all backend-authoritative."
        needs={["GET /rooms", "GET /rooms/{id}/changes"]}
      />
    </>
  );
}
