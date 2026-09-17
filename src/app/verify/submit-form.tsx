"use client";

import { useActionState } from "react";
import type { AppError } from "@/errors";

/**
 * Submit-verification form.
 *
 * Phase 4 — minimal placeholder UI. The `action` prop is passed from the
 * parent Server Component — client components cannot directly import
 * `server-only` modules. The action is `submitVerification` from
 * `@/server/verification`.
 *
 * In a real implementation, this would integrate with Phase 3's
 * `requestVerificationDocumentUploadUrl` + `confirmVerificationDocumentUpload`
 * to handle the file upload flow client-side. For Phase 4, the form accepts
 * the two confirmed storage paths as text inputs (clearly marked as a
 * temporary control for verification purposes only).
 *
 * Visual polish belongs to a later phase.
 */

interface SubmitVerificationActionResult {
  verificationId: string;
  status: "submitted";
}

interface FormState {
  error?: { code: string; message: string };
  success?: { verificationId: string };
}

export function SubmitVerificationForm({
  action,
}: {
  action: (
    input: unknown,
  ) => Promise<SubmitVerificationActionResult>;
}) {
  const [state, formAction, isPending] = useActionState<
    FormState,
    FormData
  >(async (_prev: FormState, formData: FormData) => {
    try {
      const result = await action({
        idDocumentPath: formData.get("idDocumentPath"),
        ownershipEvidencePath: formData.get("ownershipEvidencePath"),
      });
      return { success: { verificationId: result.verificationId } };
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
    <form action={formAction} className="mt-4 space-y-4" noValidate>
      <div>
        <label
          htmlFor="idDocumentPath"
          className="block text-sm font-medium"
        >
          ID document storage path{" "}
          <span className="text-xs text-gray-400">
            (temporary control — Phase 4 placeholder)
          </span>
        </label>
        <input
          id="idDocumentPath"
          name="idDocumentPath"
          type="text"
          required
          placeholder="verification/{landlordId}/id/{uuid}.{ext}"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
        <p className="mt-1 text-xs text-gray-500">
          In production, this field is hidden — the file upload flow
          (Phase 3) returns the path automatically. The form here is a
          placeholder so the Server Action boundary can be exercised.
        </p>
      </div>
      <div>
        <label
          htmlFor="ownershipEvidencePath"
          className="block text-sm font-medium"
        >
          Ownership evidence storage path{" "}
          <span className="text-xs text-gray-400">
            (temporary control — Phase 4 placeholder)
          </span>
        </label>
        <input
          id="ownershipEvidencePath"
          name="ownershipEvidencePath"
          type="text"
          required
          placeholder="verification/{landlordId}/ownership_evidence/{uuid}.{ext}"
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
      {state.success ? (
        <p
          role="status"
          className="rounded-md bg-green-50 p-3 text-sm text-green-700"
        >
          Verification submitted (ID: {state.success.verificationId}).
          Awaiting admin review.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Submit verification"}
      </button>
    </form>
  );
}
