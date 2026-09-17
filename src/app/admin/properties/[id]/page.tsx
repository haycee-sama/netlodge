import Link from "next/link";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { approveProperty, rejectProperty } from "@/server/properties";
import { suspendProperty, liftSuspensionProperty } from "@/server/admin";
import { PropertyAdminForm } from "./property-admin-form";

/**
 * Admin property review + suspension page.
 *
 * Phase 10 — pulls the live property state (including is_suspended) from the
 * database, then renders the admin form. The form receives the Server Actions
 * as props (client components cannot directly import `server-only` modules —
 * same pattern as Phase 4's verification review page).
 *
 * Route-protected: unauthenticated → /login. Non-admin → /dashboard.
 */
export default async function AdminPropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/admin/properties");
  }
  if (user.profile.role !== "admin") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const db = await createSessionClient();

  const { data: property, error } = await db
    .from("properties")
    .select(
      "id, status, is_suspended, suspension_reason, area, description, address",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !property) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Property not found</h1>
        <p className="mt-4 text-sm text-gray-600">
          The property you&apos;re looking for does not exist or you do not have
          access to it.
        </p>
        <p className="mt-6 text-xs text-gray-500">
          <Link href="/admin/properties" className="text-blue-700 hover:underline">
            ← Back to property queue
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Property review</h1>
        <p className="mt-2 text-sm text-gray-600">
          Property ID: <code className="text-xs">{id}</code>
        </p>
      </header>
      {/* Cast needed because the loose SupabaseDbClient typing returns
          a generic object. The query above selected exactly these columns. */}
      <PropertyAdminForm
        property={property as never}
        approveAction={approveProperty}
        rejectAction={rejectProperty}
        suspendAction={suspendProperty}
        liftSuspensionAction={liftSuspensionProperty}
      />
      <p className="mt-6 text-xs text-gray-500">
        <Link href="/admin/properties" className="text-blue-700 hover:underline">
          ← Back to property queue
        </Link>
      </p>
    </main>
  );
}
