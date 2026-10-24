/** Create account (FE-02 wires the session) — FE-01 shell only. */
import { PageHeading } from "@/components/ui/PageHeading";
import { AuthFormShell } from "@/components/ui/AuthFormShell";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <PageHeading title="Create account" description="Free accounts can join and post in existing community rooms." />
      <AuthFormShell kind="register" />
    </>
  );
}
