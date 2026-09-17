"use client";

import { useActionState } from "react";
import type { AuthenticatedUser } from "@/lib/auth";
import type { AppError } from "@/errors";

/**
 * Login form — client component that invokes the `login` Server Action.
 *
 * Phase 2 — minimal placeholder. Visual polish belongs to a later phase.
 * The form's only purpose is to:
 *   - collect email + password
 *   - call the Server Action
 *   - display inline errors from the action result
 *   - redirect to /dashboard on success (handled by the Server Action
 *     returning a redirect, which the parent uses to navigate)
 */
interface LoginFormProps {
  action: (
    input: unknown,
  ) => Promise<{ user: AuthenticatedUser }>;
}

interface FormState {
  error?: { code: string; message: string };
}

export function LoginForm({ action }: LoginFormProps) {
  // `useActionState` (React 19) is the canonical way to wire a Server Action
  // to a form with state. The first element of the returned tuple is the
  // state passed to the action as its second argument (we don't use it here
  // — the form data is the first argument).
  const [state, formAction, isPending] = useActionState<
    FormState,
    FormData
  >(async (_prevState: FormState, formData: FormData) => {
    try {
      const input = {
        email: formData.get("email"),
        password: formData.get("password"),
      };
      await action(input);
      // On success, the Server Component will redirect on next render —
      // we can also redirect here via `router.push("/dashboard")`, but
      // simplest is to let the page-level `getCurrentSession()` redirect
      // when the user lands on /login again (which won't happen since
      // they're now logged in). For now, return empty state.
      return {};
    } catch (err) {
      const error = err as AppError | Error;
      if ("code" in error && typeof error.code === "string") {
        return {
          error: {
            code: error.code,
            message: error.message,
          },
        };
      }
      return {
        error: {
          code: "internal_error",
          message: "Something went wrong. Please try again.",
        },
      };
    }
  }, {});

  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>
      {state.error ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {state.error.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
