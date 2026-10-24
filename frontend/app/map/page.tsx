/**
 * Stadium map (FE-05).
 *
 * Verified coordinates only. Fixtures without a mappable venue are listed as
 * `Location unavailable` rather than being given a guessed position.
 */
import { PageHeading } from "@/components/ui/PageHeading";
import { StadiumMapScreen } from "@/components/map/StadiumMapScreen";

export const metadata = { title: "Map" };

export default function MapPage() {
  return (
    <>
      <PageHeading
        title="Stadium map"
        description="Where this round is being played. Stadium colour comes from the server's own aggregate state, so it stays correct even with the demo clock frozen."
      />
      <StadiumMapScreen />
    </>
  );
}
