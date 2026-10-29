"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Checks whether the current student has completed onboarding
 * (profile_completed = true on their profiles row).
 *
 * Returns { completed, loading, checkAndRedirect }.
 *
 * `checkAndRedirect()` returns true if the student is allowed to proceed
 * (onboarding complete). If not, it redirects to /student/onboarding and
 * returns false.
 */
export function useOnboardingGate() {
  const { session } = useAuth();
  const router = useRouter();
  const [completed, setCompleted] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!session?.userId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("profile_completed")
      .eq("id", session.userId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setCompleted(false);
        } else {
          setCompleted(!!data.profile_completed);
        }
        setLoading(false);
      });
  }, [session?.userId]);

  const checkAndRedirect = React.useCallback((): boolean => {
    if (loading) return false;
    if (!completed) {
      router.push("/student/onboarding");
      return false;
    }
    return true;
  }, [completed, loading, router]);

  return { completed, loading, checkAndRedirect };
}
