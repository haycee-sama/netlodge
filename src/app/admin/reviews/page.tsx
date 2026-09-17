import Link from "next/link";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";
import { listReviewsAdmin } from "@/server/reviews";

/**
 * Admin reviews moderation page — Phase 11.
 *
 * Read-only list of all reviews (including hidden). Admin can hide/unhide
 * from this page.
 *
 * Route-protected: unauthenticated → /login. Non-admin → /dashboard.
 */
export default async function AdminReviewsPage() {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/admin/reviews");
  }
  if (user.profile.role !== "admin") {
    redirect("/dashboard");
  }

  let reviews;
  try {
    reviews = await listReviewsAdmin({ page: 1, pageSize: 50 });
  } catch {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
        <p className="mt-4 text-red-700">
          Could not load reviews. Please try again later.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
        <p className="mt-2 text-sm text-gray-600">
          All student reviews (including hidden). Moderation actions: hide / unhide.
        </p>
      </header>

      {reviews.items.length === 0 ? (
        <p className="rounded-md border border-gray-200 p-6 text-sm text-gray-600">
          No reviews found.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Rating</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Content</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviews.items.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-medium">{r.rating}★</td>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    {r.content.slice(0, 100)}
                    {r.content.length > 100 ? "…" : ""}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        "hidden_reason" in r && r.hidden_reason
                          ? "rounded-full bg-red-100 px-2 py-1 text-xs text-red-800"
                          : "rounded-full bg-green-100 px-2 py-1 text-xs text-green-800"
                      }
                    >
                      {"hidden_reason" in r && r.hidden_reason ? "Hidden" : "Visible"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-gray-500">
            Showing {reviews.items.length} of {reviews.totalCount} reviews.
          </p>
        </div>
      )}

      <p className="mt-6 text-xs text-gray-500">
        <Link href="/admin" className="text-blue-700 hover:underline">
          ← Back to admin home
        </Link>
      </p>
    </main>
  );
}
