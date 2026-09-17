import Link from "next/link";
import { getCurrentSession } from "@/server/auth";
import type { AuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * NetLodge home page.
 *
 * The home page is a public landing page. It should NEVER crash — if the
 * Supabase session check fails (network error, timeout, etc.), we render
 * the unauthenticated version rather than showing an error page.
 */
export default async function HomePage() {
  let user: AuthenticatedUser | null = null;
  try {
    user = await getCurrentSession();
  } catch {
    // Supabase unreachable or session lookup failed — render as anonymous.
    user = null;
  }

  return (
    <main
      id="main-content"
      className="mx-auto min-h-dvh max-w-3xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <header className="mb-12">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">
          NetLodge
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          The verified way for Nigerian students to find and reserve
          off-campus housing.
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Discover verified rooms near your university, reserve in seconds,
          and pay securely with Paystack.
        </p>
      </header>

      <nav
        aria-label={user ? "Authenticated navigation" : "Public navigation"}
        className="mt-8 flex flex-wrap gap-3 text-sm"
      >
        {user ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
          >
            Go to dashboard →
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
            >
              Sign in
            </Link>
            <Link
              href="/register/student"
              className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Register as student
            </Link>
            <Link
              href="/register/landlord"
              className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Register as landlord
            </Link>
          </>
        )}
      </nav>

      <section className="mt-12" aria-label="Features">
        <h2 className="text-xl font-semibold">Why NetLodge?</h2>
        <ul className="mt-4 space-y-3 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong className="text-gray-900">Verified landlords</strong> — every landlord is identity-verified before listing</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong className="text-gray-900">Secure payments</strong> — Paystack integration with webhook-verified confirmation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong className="text-gray-900">Real-time availability</strong> — rooms are reserved instantly, no double-booking</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong className="text-gray-900">Student reviews</strong> — read honest reviews from students who actually lived there</span>
          </li>
        </ul>
      </section>

      <section className="mt-12" aria-label="Get started">
        <h2 className="text-xl font-semibold">Get started</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900">For Students</h3>
            <p className="mt-2 text-sm text-gray-600">
              Find verified rooms near your university. Reserve instantly, pay
              securely, and move in with confidence.
            </p>
            <Link
              href="/register/student"
              className="mt-3 inline-flex items-center text-sm font-medium text-blue-700 hover:underline"
            >
              Register as student →
            </Link>
          </div>
          <div className="rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900">For Landlords</h3>
            <p className="mt-2 text-sm text-gray-600">
              List your property to thousands of verified students. Get
              verified, create listings, and receive reservations.
            </p>
            <Link
              href="/register/landlord"
              className="mt-3 inline-flex items-center text-sm font-medium text-blue-700 hover:underline"
            >
              Register as landlord →
            </Link>
          </div>
        </div>
      </section>

      <footer className="mt-16 border-t border-gray-200 pt-8 text-sm text-gray-500">
        <p>NetLodge — Verified student accommodation marketplace.</p>
      </footer>
    </main>
  );
}
