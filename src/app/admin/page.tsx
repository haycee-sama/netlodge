import Link from "next/link";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";

/**
 * Admin home — Phase 10.
 *
 * Read-only landing summarizing the available admin queues / monitors.
 * This is a convenience navigation hub, not a load-bearing security or
 * business component (IMPLEMENTATION_PLAN.md §14 step 2).
 *
 * Route-protected: unauthenticated → /login. Non-admin → /dashboard.
 */
export default async function AdminHomePage() {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (user.profile.role !== "admin") {
    redirect("/dashboard");
  }

  const links = [
    {
      href: "/admin/verifications",
      title: "Verification queue",
      description: "Review landlord verification submissions (approve / reject).",
    },
    {
      href: "/admin/properties",
      title: "Property queue",
      description:
        "Review property submissions (approve / reject / suspend / lift suspension).",
    },
    {
      href: "/admin/bookings",
      title: "Bookings monitor",
      description: "Read-only view of all bookings across the platform.",
    },
    {
      href: "/admin/payments",
      title: "Payments monitor",
      description:
        "Read-only view of all payment transactions (including provider metadata).",
    },
    {
      href: "/admin/reports",
      title: "Reports queue",
      description:
        "Review and resolve reports filed by students and landlords.",
    },
    {
      href: "/admin/reviews",
      title: "Reviews moderation",
      description:
        "All student reviews (including hidden). Hide / unhide moderation.",
    },
    {
      href: "/admin/audit-logs",
      title: "Audit logs",
      description:
        "Append-only audit trail of every security-sensitive admin action.",
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="mt-2 text-sm text-gray-600">
          Signed in as {user.profile.fullName}. Every operation below is
          independently authorized at the database layer — the UI is
          presentation, the server is the security boundary.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-md border border-gray-200 p-6 transition hover:border-blue-500 hover:bg-blue-50"
            >
              <h2 className="text-lg font-semibold text-gray-900">
                {link.title}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{link.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
