/**
 * Sign in and create account (FE-02).
 *
 * The session is an HttpOnly cookie set by the backend, so there is no token
 * handling here at all. On success the query cache is cleared by `AuthBoundary`
 * (identity changed) and the user is returned to a validated `?next=` path.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLogin, useRegister } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import { safeReturnPath } from "@/lib/safe-redirect";

type Props = {
  readonly kind: "login" | "register";
  /**
   * Raw `?next=` from the server page. Passed in rather than read with
   * `useSearchParams`, so the form server-renders instead of needing a Suspense
   * boundary and JavaScript to appear at all.
   */
  readonly next?: string | null;
};

/** A1 codes a sign-in form can legitimately receive. */
function messageFor(error: ApiError, kind: Props["kind"]): string {
  if (error.status === 401) return "Those details were not accepted. Check them and try again.";
  if (error.code === "INVALID_INPUT") {
    return kind === "register"
      ? "Check the form: one of those values was rejected."
      : "Check your email and password.";
  }
  if (error.code === "CSRF_ORIGIN_INVALID") {
    return "This page was served from an origin the server does not trust, so the request was blocked.";
  }
  if (error.code === "RATE_LIMITED") return "Too many attempts. Wait a moment and try again.";
  if (!error.conformed) {
    return "The server replied in a shape this build does not recognise. This is a contract mismatch, not your details.";
  }
  return error.message;
}

export function AuthForm({ kind, next = null }: Props) {
  const isRegister = kind === "register";
  const router = useRouter();
  const login = useLogin();
  const register = useRegister();
  const mutation = isRegister ? register : login;

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;

    try {
      if (isRegister) {
        await register.mutateAsync({ email, display_name: displayName, password });
      } else {
        await login.mutateAsync({ email, password });
      }
      // Validated, so a crafted `next` cannot redirect off-site.
      router.replace(safeReturnPath(next));
    } catch {
      // Rendered below from the mutation's error.
    }
  }

  const error = mutation.error;

  return (
    <div className="max-w-md space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <fieldset disabled={mutation.isPending} className="space-y-4">
          <legend className="sr-only">{isRegister ? "Create an account" : "Sign in"}</legend>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-semibold text-ink">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink"
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
                required
                autoComplete="nickname"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink"
              />
              <p className="text-xs text-ink-muted">
                Shown next to anything you post in a community room.
              </p>
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
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-ink px-3 py-2 text-sm font-semibold text-surface-raised disabled:opacity-60"
          >
            {mutation.isPending
              ? isRegister
                ? "Creating account…"
                : "Signing in…"
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </fieldset>
      </form>

      {error ? (
        <p role="alert" className="rounded-md border border-red-500/50 bg-red-500/5 px-3 py-2 text-sm text-ink">
          {error instanceof ApiError ? messageFor(error, kind) : "Something went wrong. Try again."}
          {error instanceof ApiError && error.requestId ? (
            <span className="mt-1 block text-xs text-ink-muted">
              Reference: <code className="font-mono">{error.requestId}</code>
            </span>
          ) : null}
        </p>
      ) : null}

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
        You can browse the Journey, map and match pages without an account. Signing in is only needed
        to save a favourite club, post in rooms, make predictions and open a private What-if thread.
      </p>
    </div>
  );
}
