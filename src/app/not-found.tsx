import Link from "next/link";

/**
 * 404 page (Phase 0 baseline).
 *
 * Plain, semantic, accessible. No leaked internal info, no jarring styling —
 * visual polish belongs to a later phase. Provides a path back to the home
 * page so a user is never stranded.
 */
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 py-16 text-center"
    >
      <p className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">
        404
      </p>
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-4 text-gray-600">
        The page you were looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        ← Back to home
      </Link>
    </main>
  );
}
