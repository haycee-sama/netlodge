"use client";

/**
 * Global error boundary (Phase 0 baseline).
 *
 * Catches unhandled runtime errors in any route segment. Per API_CONTRACTS
 * §19, no internal details (stack, file paths, Supabase/Paystack payloads)
 * are shown to users — only a generic, honest message.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Console-only — server-side logs are emitted by Next.js automatically.
  console.error("[netlodge] global error boundary:", error);

  return (
    <html lang="en">
      <body>
        <main
          id="main-content"
          className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 py-16 text-center"
        >
          <h1 className="text-3xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-4 text-gray-600">
            An unexpected error occurred. Please try again — if the problem
            persists, refresh the page.
          </p>
          {error.digest ? (
            <p className="mt-2 text-xs text-gray-400">
              Reference: <code>{error.digest}</code>
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            className="mt-8 inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
