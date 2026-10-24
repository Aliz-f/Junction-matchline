/**
 * Community (FE-07). Global room discovery, independent of a favourite club.
 */
import { PageHeading } from "@/components/ui/PageHeading";
import { CommunityScreen } from "@/components/community/CommunityScreen";

export const metadata = { title: "Community" };

export default function CommunityPage() {
  return (
    <>
      <PageHeading
        title="Community"
        description="Per-match discussion rooms. Anyone can read; a free account can post in any open room, and premium accounts can create new ones."
      />
      <CommunityScreen />
    </>
  );
}
