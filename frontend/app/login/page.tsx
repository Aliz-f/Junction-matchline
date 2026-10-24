/** Sign in (FE-02 wires the session) — FE-01 shell only. */
import { PageHeading } from "@/components/ui/PageHeading";
import { AuthFormShell } from "@/components/ui/AuthFormShell";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <PageHeading title="Sign in" description="Sessions are cookie-backed and set by the backend." />
      <AuthFormShell kind="login" />
    </>
  );
}
