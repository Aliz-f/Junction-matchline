/**
 * Profile (FE-08, G3). Prediction history and badges only; the private
 * What-if thread list arrives with FE-09 at G4.
 */
import { PageHeading } from "@/components/ui/PageHeading";
import { ProfileScreen } from "@/components/profile/ProfileScreen";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeading
        title="Profile"
        description="Your favourite club, prediction history and badges. Private to you."
      />
      <ProfileScreen />
    </>
  );
}
