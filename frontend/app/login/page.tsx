/** Sign in (FE-02). */
import { PageHeading } from "@/components/ui/PageHeading";
import { AuthForm } from "@/components/ui/AuthForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = (await searchParams).next;

  return (
    <>
      <PageHeading title="Sign in" description="Sessions are cookie-backed and set by the backend." />
      <AuthForm kind="login" next={Array.isArray(next) ? (next[0] ?? null) : (next ?? null)} />
    </>
  );
}
