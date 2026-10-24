/** Create account (FE-02). */
import { PageHeading } from "@/components/ui/PageHeading";
import { AuthForm } from "@/components/ui/AuthForm";

export const metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = (await searchParams).next;

  return (
    <>
      <PageHeading
        title="Create account"
        description="Free accounts can join and post in existing community rooms."
      />
      <AuthForm kind="register" next={Array.isArray(next) ? (next[0] ?? null) : (next ?? null)} />
    </>
  );
}
