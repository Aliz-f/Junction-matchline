/**
 * Profile route (FE-08, gate G3) — FE-01 shell only.
 *
 * The route exists, is directly linkable and reload-safe. The screen itself is
 * delivered by FE-08; nothing is fabricated here in the meantime.
 */
import { PageHeading } from "@/components/ui/PageHeading";
import { PlannedSurface } from "@/components/ui/PlannedSurface";

export const metadata = { title: "Profile" };

export default function Page() {
  return (
    <>
      <PageHeading title="Profile" />
      <PlannedSurface
        task="FE-08"
        gate="G3"
        title="Prediction history and badges"
        summary="Your prediction history, settled scores and earned badges. Changing your favourite club never clears this history."
        needs={["GET /users/me", "GET /users/me/predictions", "GET /users/me/badges"]}
      />
    </>
  );
}
