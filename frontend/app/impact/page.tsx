/**
 * My Team Impact (FE-06).
 *
 * How other results move your club's points gap, plus the current table. The
 * two are kept visually separate so a historical calculation is never read as
 * the live standings.
 */
import { PageHeading } from "@/components/ui/PageHeading";
import { ImpactScreen } from "@/components/impact/ImpactScreen";

export const metadata = { title: "My Team Impact" };

export default function ImpactPage() {
  return (
    <>
      <PageHeading
        title="My Team Impact"
        description="What other results mean for your club. Every figure comes from the server; nothing is recalculated here, and an effect that cannot be verified is labelled rather than guessed."
      />
      <ImpactScreen />
    </>
  );
}
