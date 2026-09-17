import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
import { getCurrentSession, registerLandlord } from "@/server/auth";
import { RegisterForm } from "../register-form";

/**
 * Landlord registration page.
 *
 * Phase 2 — minimal placeholder. Calls the `registerLandlord` Server Action
 * which hardcodes `role = 'landlord'` server-side.
 */
export default async function RegisterLandlordPage() {
  const user = await getCurrentSession();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-16"
    >
      <h1 className="text-3xl font-bold tracking-tight">
        Create a landlord account
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        List your verified properties to reach students near campus.
      </p>
      <RegisterForm
        action={registerLandlord}
        requireUniversity={false}
        submitLabel="Create landlord account"
      />
    </main>
  );
}
