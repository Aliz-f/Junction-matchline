/**
 * Accessible, intentionally inert auth form (FE-01).
 *
 * Every input has a real associated label and autocomplete hint, so FE-02 only
 * has to attach submission and error handling. Nothing is submitted here.
 */
import Link from "next/link";
import { DisabledFormNotice } from "./DisabledFormNotice";

type Props = {
  readonly kind: "login" | "register";
};

export function AuthFormShell({ kind }: Props) {
  const isRegister = kind === "register";

  return (
    <div className="max-w-md space-y-4">
      <DisabledFormNotice task="FE-02" what={isRegister ? "Account creation" : "Sign in"} />

      <form className="space-y-4" aria-describedby="auth-disabled">
        <fieldset disabled className="space-y-4">
          <legend className="sr-only">{isRegister ? "Create an account" : "Sign in"}</legend>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-semibold text-ink">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink
                         disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {isRegister ? (
            <div className="space-y-1.5">
              <label htmlFor="display_name" className="block text-sm font-semibold text-ink">
                Display name
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                autoComplete="nickname"
                className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink
                           disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-semibold text-ink">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink
                         disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-ink px-3 py-2 text-sm font-semibold text-surface-raised
                       disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRegister ? "Create account" : "Sign in"}
          </button>
        </fieldset>
      </form>

      <p className="text-sm text-ink-muted">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-ink underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            No account yet?{" "}
            <Link href="/register" className="font-semibold text-ink underline">
              Create one
            </Link>
          </>
        )}
      </p>

      <p className="text-xs text-ink-muted">
        You can browse the Journey, map and match pages without an account. Signing in is only needed to save a
        favourite club, post in rooms, make predictions and open a private What-if thread.
      </p>
    </div>
  );
}
