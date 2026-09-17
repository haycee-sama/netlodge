"use client";

import { useActionState } from "react";
import type { AppError } from "@/errors";

interface FormState {
  error?: { code: string; message: string };
  success?: { reportId: string };
}

/**
 * Report submission form.
 *
 * Phase 11 — receives the Server Action as a prop (client components
 * cannot directly import server-only modules). The targetType is
 * validated client-side AND server-side (Zod .strict() + closed enum).
 */
export function ReportForm({
  createReportAction,
  defaultTargetType,
  defaultTargetId,
}: {
  createReportAction: (input: unknown) => Promise<{ reportId: string }>;
  defaultTargetType?: string;
  defaultTargetId?: string;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      const targetType = formData.get("targetType");
      const targetId = formData.get("targetId");
      const reasonCategory = formData.get("reasonCategory");
      const description = formData.get("description");

      try {
        const result = await createReportAction({
          targetType,
          targetId,
          reasonCategory,
          description: description || undefined,
        });
        return { success: { reportId: result.reportId } };
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
    },
    {},
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <label htmlFor="targetType" className="block text-sm font-medium">
          What are you reporting?
        </label>
        <select
          id="targetType"
          name="targetType"
          required
          defaultValue={defaultTargetType ?? ""}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        >
          <option value="">Select…</option>
          <option value="property">A property</option>
          <option value="room">A room</option>
          <option value="user">A user</option>
        </select>
      </div>

      <div>
        <label htmlFor="targetId" className="block text-sm font-medium">
          Target ID (UUID)
        </label>
        <input
          id="targetId"
          name="targetId"
          type="text"
          required
          defaultValue={defaultTargetId ?? ""}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base font-mono text-sm"
          placeholder="00000000-0000-0000-0000-000000000000"
        />
        <p className="mt-1 text-xs text-gray-500">
          The ID of the property, room, or user you are reporting.
        </p>
      </div>

      <div>
        <label htmlFor="reasonCategory" className="block text-sm font-medium">
          Reason category
        </label>
        <input
          id="reasonCategory"
          name="reasonCategory"
          type="text"
          required
          maxLength={100}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          placeholder="e.g., fraudulent listing, misrepresentation, inappropriate content"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={5000}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          placeholder="Provide additional details about the issue."
        />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error.message}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Report submitted. Reference: {state.success.reportId.slice(0, 8)}…
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
