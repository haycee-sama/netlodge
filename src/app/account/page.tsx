import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
import { getCurrentSession } from "@/server/auth";
import { updateOwnProfile } from "@/server/auth/actions";
import { AccountForm } from "./account-form";

/**
 * Account page — edit own profile.
 *
 * Phase 2 — minimal placeholder. Calls the `updateOwnProfile` Server Action
 * which accepts only `fullName`, `phone`, `universityId` (per API_CONTRACTS
 * §3 profile.updateOwn). The schema's `.strict()` rejects `role` /
 * `accountStatus` fields — they're not silently ignored.
 *
 * Route-protected: unauthenticated users redirect to /login.
 */
export default async function AccountPage() {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/account");
  }

  return (
    <main
      id="main-content"
      className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit profile</h1>
        <p className="mt-2 text-sm text-gray-600">
          Update your name, phone, or university.
        </p>
      </header>

      <AccountForm
        action={updateOwnProfile}
        defaultValues={{
          fullName: user.profile.fullName,
          phone: user.profile.phone,
          universityId: user.profile.universityId ?? "",
        }}
        accountStatus={user.profile.accountStatus}
      />
    </main>
  );
}
