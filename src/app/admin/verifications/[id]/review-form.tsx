"use client";

import { useActionState } from "react";
import type { AppError } from "@/errors";

/**
 * Review form — admin can approve or reject a verification submission.
 *
 * Phase 4 — minimal placeholder. The `approveAction` and `rejectAction`
 * props are passed from the parent Server Component — client components
 * cannot directly import `server-only` modules.
 *
 * The `verificationId` is passed as a prop (server-derived from the URL
 * param) — it's NOT a client-controlled field.
 */

interface ApproveActionResult {
  verificationId: string;
  status: "approved";
}

interface RejectActionResult {
  verificationId: string;
  status: "rejected";
  decisionReason: string;
}

interface FormState {
  error?: { code: string; message: string };
  success?: { action: "approved" | "rejected" };
}

export function ReviewForm({
  verificationId,
  approveAction,
  rejectAction,
}: {
  verificationId: string;
  approveAction: (input: unknown) => Promise<ApproveActionResult>;
  rejectAction: (input: unknown) => Promise<RejectActionResult>;
}) {
  const [state, formAction, isPending] = useActionState<
    FormState,
    FormData
  >(async (_prev: FormState, formData: FormData) => {
    const action = formData.get("action");
    try {
      if (action === "approve") {
        await approveAction({ verificationId });
        return { success: { action: "approved" as const } };
      }
      if (action === "reject") {
        const reason = formData.get("reason");
        await rejectAction({ verificationId, reason });
        return { success: { action: "rejected" as const } };
      }
      return {
        error: {
          code: "validation_error",
          message: "Unknown action.",
        },
      };
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
      <input type="hidden" name="verificationId" value={verificationId} />

      <div>
        <label htmlFor="reason" className="block text-sm font-medium">
          Rejection reason{" "}
          <span className="text-xs text-gray-400">
            (required only if rejecting)
          </span>
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={4}
          maxLength={2000}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          placeholder="Required if rejecting. Explain why the submission is being rejected."
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
          Verification {state.success.action}.
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          name="action"
          value="approve"
          disabled={isPending}
          className="inline-flex items-center rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
        >
          {isPending ? "Processing…" : "Approve"}
        </button>
        <button
          type="submit"
          name="action"
          value="reject"
          disabled={isPending}
          className="inline-flex items-center rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {isPending ? "Processing…" : "Reject"}
        </button>
      </div>
    </form>
  );
}
