"use client";

import { useActionState } from "react";
import type { AuthenticatedUser } from "@/lib/auth";
import type { AppError } from "@/errors";

/**
 * Account form — edit fullName, phone, universityId.
 *
 * Phase 2 — minimal placeholder. The schema (`profileUpdateSchema`) is
 * `.strict()`, so submitting `role` or `accountStatus` as form fields
 * produces a validation_error — they're not silently stripped.
 */
interface AccountFormProps {
  action: (
    input: unknown,
  ) => Promise<{ user: AuthenticatedUser }>;
  defaultValues: {
    fullName: string;
    phone: string;
    universityId: string;
  };
  accountStatus: "active" | "suspended";
}

interface FormState {
  error?: { code: string; message: string };
  success?: boolean;
}

export function AccountForm({
  action,
  defaultValues,
  accountStatus,
}: AccountFormProps) {
  const [state, formAction, isPending] = useActionState<
    FormState,
    FormData
  >(async (_prevState: FormState, formData: FormData) => {
    try {
      const input: Record<string, unknown> = {
        fullName: formData.get("fullName"),
        phone: formData.get("phone"),
      };
      const universityId = formData.get("universityId");
      if (universityId && typeof universityId === "string" && universityId.trim() !== "") {
        input.universityId = universityId;
      } else {
        input.universityId = null;
      }
      await action(input);
      return { success: true };
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
    <form action={formAction} className="space-y-4" noValidate>
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
          defaultValue={defaultValues.fullName}
          disabled={accountStatus === "suspended"}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
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
          defaultValue={defaultValues.phone}
          disabled={accountStatus === "suspended"}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
        />
      </div>
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
          defaultValue={defaultValues.universityId}
          disabled={accountStatus === "suspended"}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
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
      {state.success ? (
        <p
          role="status"
          className="rounded-md bg-green-50 p-3 text-sm text-green-700"
        >
          Profile updated.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || accountStatus === "suspended"}
        className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>

      {accountStatus === "suspended" ? (
        <p className="text-xs text-gray-500">
          Your account is suspended — profile updates are not permitted
          while suspended.
        </p>
      ) : null}
    </form>
  );
}
