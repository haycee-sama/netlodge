import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
import { getCurrentSession, registerStudent } from "@/server/auth";
import { RegisterForm } from "../register-form";

/**
 * Student registration page.
 *
 * Phase 2 — minimal placeholder. Calls the `registerStudent` Server Action
 * which hardcodes `role = 'student'` server-side.
 */
export default async function RegisterStudentPage() {
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
        Create a student account
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Find verified off-campus housing near your university.
      </p>
      <RegisterForm
        action={registerStudent}
        requireUniversity
        submitLabel="Create student account"
      />
    </main>
  );
}
