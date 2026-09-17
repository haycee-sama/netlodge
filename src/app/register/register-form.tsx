"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthenticatedUser } from "@/lib/auth";
import type { AppError } from "@/errors";

/**
 * Registration form — shared by student + landlord registration pages.
 *
 * Phase 2 — minimal placeholder. The actual UI for selecting a university
 * will be built in a later phase (it needs `universities.list` data via
 * a public discovery Server Action that doesn't exist yet). For now, the
 * student form requires a universityId as text input — clearly marked as
 * a temporary control for Phase 2 verification purposes only.
 *
 * Visual polish belongs to a later phase.
 */
interface RegisterFormProps {
  action: (
    input: unknown,
  ) => Promise<{ user: AuthenticatedUser }>;
  requireUniversity: boolean;
  submitLabel: string;
}

interface FormState {
  error?: { code: string; message: string };
}

export function RegisterForm({
  action,
  requireUniversity,
  submitLabel,
}: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState<
    FormState,
    FormData
  >(async (_prevState: FormState, formData: FormData) => {
    try {
      const input: Record<string, unknown> = {
        email: formData.get("email"),
        password: formData.get("password"),
        fullName: formData.get("fullName"),
        phone: formData.get("phone"),
      };
      if (requireUniversity) {
        input.universityId = formData.get("universityId");
      }
      await action(input);
      return {};
    } catch (err) {
      const error = err as AppError | Error;
      if ("code" in error && typeof error.code === "string") {
        return { error: { code: error.code, message: error.message } };
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
        <label htmlFor="fullName" className="block text-sm font-medium">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>
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
        <label htmlFor="phone" className="block text-sm font-medium">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
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
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
        <p className="mt-1 text-xs text-gray-500">
          At least 8 characters, including one letter and one number.
        </p>
      </div>
      {requireUniversity ? (
        <div>
          <label
            htmlFor="universityId"
            className="block text-sm font-medium"
          >
            University ID{" "}
            <span className="text-xs text-gray-400">
              (temporary control — Phase 2 placeholder)
            </span>
          </label>
          <input
            id="universityId"
            name="universityId"
            type="text"
            required
            defaultValue="00000000-0000-0000-0000-000000000001"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
          <p className="mt-1 text-xs text-gray-500">
            The launch-target university is pre-filled. A real university
            selector arrives in Phase 6 (Discovery).
          </p>
        </div>
      ) : null}
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
        {isPending ? "Creating account…" : submitLabel}
      </button>
      <p className="text-center text-xs text-gray-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-gray-700 underline hover:text-gray-900"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
