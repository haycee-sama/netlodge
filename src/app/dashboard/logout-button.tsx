"use client";

import { useTransition } from "react";

/**
 * Logout button — client component wrapping the `logout` Server Action.
 *
 * Uses `useTransition` so the button shows a "Signing out…" state during
 * the server round-trip. The form itself is rendered by the parent Server
 * Component (so the action is bound server-side).
 */
export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="submit"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          // The form's action handler runs the logout Server Action.
          // No additional client-side work needed — the form submission
          // triggers the server action via React 19's progressive
          // enhancement.
        });
      }}
      className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
