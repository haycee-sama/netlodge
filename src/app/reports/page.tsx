import Link from "next/link";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";
import { createReport } from "@/server/reports";
import { ReportForm } from "./report-form";

/**
 * Report submission page — Phase 11.
 *
 * Authenticated students and landlords can file reports against
 * properties, rooms, or users.
 *
 * Route-protected: unauthenticated → /login. Admins redirected to
 * /admin/reports (admins don't file reports — they ARE the resolution
 * authority).
 */
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/reports");
  }
  if (user.profile.role === "admin") {
    redirect("/admin/reports");
  }

  const params = await searchParams;
  const targetType = Array.isArray(params.targetType) ? params.targetType[0] : params.targetType;
  const targetId = Array.isArray(params.targetId) ? params.targetId[0] : params.targetId;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">File a report</h1>
        <p className="mt-2 text-sm text-gray-600">
 Report a listing or user for review by our admin team. Your identity is
 kept confidential from the reported party.
        </p>
      </header>
      <ReportForm
        createReportAction={createReport}
        defaultTargetType={targetType}
        defaultTargetId={targetId}
      />
      <p className="mt-6 text-xs text-gray-500">
        <Link href="/discover" className="text-blue-700 hover:underline">
          ← Back to discovery
        </Link>
      </p>
    </main>
  );
}
