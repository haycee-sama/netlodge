"use client";

import { useActionState } from "react";
import type { AppError } from "@/errors";

interface PropertyDetail {
  id: string;
  status: string;
  isSuspended: boolean;
  suspensionReason: string | null;
  area: string;
  description: string;
  address: string;
}

interface FormState {
  error?: { code: string; message: string };
  success?: { action: "approved" | "rejected" | "suspended" | "lifted" };
}

/**
 * Admin property review + suspension controls.
 *
 * Phase 10 — the form receives the Server Actions as PROPS from the parent
 * Server Component (page.tsx). Client components cannot directly import
 * `server-only` modules, so we follow the same pattern as Phase 4's
 * ReviewForm.
 *
 * The Server Actions independently re-check admin authorization
 * (`requireAccountActive` + role check); the underlying SECURITY DEFINER
 * RPC functions re-validate AGAIN inside the DB transaction. So even if
 * this entire UI were deleted, no non-admin could perform these mutations
 * via direct request.
 */
export function PropertyAdminForm({
  property,
  approveAction,
  rejectAction,
  suspendAction,
  liftSuspensionAction,
}: {
  property: PropertyDetail;
  approveAction: (input: unknown) => Promise<void>;
  rejectAction: (input: unknown) => Promise<void>;
  suspendAction: (input: unknown) => Promise<void>;
  liftSuspensionAction: (input: unknown) => Promise<void>;
}) {
  const [state, formAction, isPending] = useActionState<
    FormState,
    FormData
  >(async (_prev: FormState, formData: FormData) => {
    const action = formData.get("action");
    const reason = (formData.get("reason") as string | null)?.trim() ?? "";
    try {
      if (action === "approve") {
        await approveAction({
          propertyId: property.id,
          reason: reason || undefined,
        });
        return { success: { action: "approved" as const } };
      }
      if (action === "reject") {
        await rejectAction({ propertyId: property.id, reason });
        return { success: { action: "rejected" as const } };
      }
      if (action === "suspend") {
        await suspendAction({ propertyId: property.id, reason });
        return { success: { action: "suspended" as const } };
      }
      if (action === "lift") {
        await liftSuspensionAction({ propertyId: property.id, reason });
        return { success: { action: "lifted" as const } };
      }
      return {
        error: { code: "validation_error", message: "Unknown action." },
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

  const canApproveOrReject =
    property.status === "submitted" || property.status === "under_review";
  const canSuspend = property.status === "approved" && !property.isSuspended;
  const canLift = property.isSuspended;

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-gray-200 p-6">
        <h2 className="mb-4 text-lg font-semibold">Property state</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <dt className="text-gray-600">Status</dt>
          <dd className="font-medium capitalize">{property.status.replace(/_/g, " ")}</dd>
          <dt className="text-gray-600">Suspended</dt>
          <dd className="font-medium">{property.isSuspended ? "Yes" : "No"}</dd>
          {property.isSuspended && property.suspensionReason && (
            <>
              <dt className="text-gray-600">Suspension reason</dt>
              <dd className="text-red-700">{property.suspensionReason}</dd>
            </>
          )}
          <dt className="text-gray-600">Area</dt>
          <dd>{property.area}</dd>
          <dt className="text-gray-600">Address</dt>
          <dd>{property.address}</dd>
          <dt className="text-gray-600">Description</dt>
          <dd className="col-span-2">{property.description}</dd>
        </dl>
      </section>

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="propertyId" value={property.id} />

        <div>
          <label htmlFor="reason" className="block text-sm font-medium">
            Reason{" "}
            <span className="text-xs text-gray-400">
              (required for reject / suspend / lift; optional for approve)
            </span>
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            maxLength={2000}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            placeholder="Reason for the action."
          />
        </div>

        {state.error ? (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {state.error.message}
          </p>
        ) : null}
        {state.success ? (
          <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            Action {state.success.action} succeeded.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {canApproveOrReject && (
            <>
              <button
                type="submit"
                name="action"
                value="approve"
                disabled={isPending}
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {isPending ? "Processing…" : "Approve"}
              </button>
              <button
                type="submit"
                name="action"
                value="reject"
                disabled={isPending}
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {isPending ? "Processing…" : "Reject"}
              </button>
            </>
          )}
          {canSuspend && (
            <button
              type="submit"
              name="action"
              value="suspend"
              disabled={isPending}
              className="rounded-md bg-yellow-700 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-800 disabled:opacity-50"
            >
              {isPending ? "Processing…" : "Suspend listing"}
            </button>
          )}
          {canLift && (
            <button
              type="submit"
              name="action"
              value="lift"
              disabled={isPending}
              className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {isPending ? "Processing…" : "Lift suspension"}
            </button>
          )}
        </div>
      </form>

      <p className="text-xs text-gray-400">
        All admin mutations are independently authorized at the database layer
        — the UI is presentation, the server is the security boundary.
      </p>
    </div>
  );
}
