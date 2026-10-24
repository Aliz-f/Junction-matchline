/**
 * All matches (FE-04).
 *
 * Browsing every fixture must work without a favourite club, so this route
 * takes no team parameter and is reachable whether or not one is set.
 */
import { PageHeading } from "@/components/ui/PageHeading";
import { AllMatchesScreen } from "@/components/match/AllMatchesScreen";

export const metadata = { title: "All matches" };

export default function MatchesPage() {
  return (
    <>
      <PageHeading
        title="All matches"
        description="Every fixture in the current data set, whichever club you follow. A favourite club prioritises your Journey; it never hides other teams' matches."
      />
      <AllMatchesScreen />
    </>
  );
}
