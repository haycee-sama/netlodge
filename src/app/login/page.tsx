import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentSession } from "@/server/auth";
import { login } from "@/server/auth/actions";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * Login page.
 *
 * Phase 2 — minimal placeholder. If the user is already authenticated,
 * redirect to /dashboard. The form itself is a client component because
 * it needs to manage form state and display inline errors from the
 * Server Action.
 */
export default async function LoginPage() {
  let user = null;
  try {
    user = await getCurrentSession();
  } catch {
    // Supabase unreachable — render the login form anyway.
  }
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-16"
    >
      <h1 className="text-3xl font-bold tracking-tight">Sign in to NetLodge</h1>
      <p className="mt-2 text-sm text-gray-600">
        Use your NetLodge account email and password.
      </p>
      <LoginForm action={login} />
    </main>
  );
}
