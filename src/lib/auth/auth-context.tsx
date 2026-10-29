/**
 * Frontend authentication abstraction.
 *
 * Integrates with Supabase Auth. There is no demo mode, no localStorage
 * fallback, and no client-side role switching. The role stored here is
 * derived from the database via the auth-service and is used purely to
 * decide which UI shell to render.
 *
 * Security rules:
 *  - Any privileged operation MUST be authorised by a trusted backend.
 *  - The frontend never grants privileges.
 *  - If Supabase is unreachable, the user is treated as unauthenticated.
 */

"use client";

import * as React from "react";
import type { UserRole } from "@/lib/types";

export interface AuthSession {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  /** ISO timestamp when the session was created. */
  issuedAt: string;
  /** Always true — sessions are always backed by Supabase Auth. */
  authenticated: true;
}

export interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  /**
   * Signs the user out by calling supabase.auth.signOut().
   * Returns true if the server-side session was invalidated successfully,
   * false if the call failed (network error, Supabase error, etc.).
   *
   * On success: clears the local session state. The onAuthStateChange
   * listener also fires SIGNED_OUT, providing a second clearing path.
   *
   * On failure: does NOT clear local session state — the user may still
   * be authenticated server-side, and clearing the UI would give a false
   * sense of having signed out. The caller should show an error message.
   */
  signOut: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // On mount, try to get a Supabase session.
  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { getCurrentSession } = await import("@/lib/supabase/auth-service");
        const supabaseSession = await getCurrentSession();
        if (!cancelled) {
          setSession(supabaseSession ? { ...supabaseSession, authenticated: true } : null);
        }
      } catch {
        // Supabase not configured or error — user is unauthenticated.
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for Supabase auth state changes.
  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function setupListener() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = supabase.auth.onAuthStateChange(async (event, authSession) => {
          if (event === "SIGNED_OUT") {
            setSession(null);
          } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            if (authSession?.user) {
              try {
                const { getCurrentSession } = await import("@/lib/supabase/auth-service");
                const s = await getCurrentSession();
                if (s) setSession({ ...s, authenticated: true });
              } catch {
                // ignore
              }
            }
          }
        });
        unsubscribe = data.subscription.unsubscribe;
      } catch {
        // Supabase not configured — no listener
      }
    }

    setupListener();
    return () => {
      unsubscribe?.();
    };
  }, []);

  const signOut = React.useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      // supabase.auth.signOut() invalidates the server-side session and
      // clears the auth cookies. It returns { error } on failure.
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Supabase returned an error — the session may still be active.
        // Do NOT clear local state; the user is still authenticated.
        return { success: false, error: error.message };
      }
      // Success — clear local session state. The onAuthStateChange
      // listener (SIGNED_OUT event) also clears, providing a second path.
      setSession(null);
      return { success: true };
    } catch (err) {
      // Network or unexpected error — the session may still be active
      // server-side. Do NOT clear local state; show an error instead.
      return {
        success: false,
        error: err instanceof Error ? err.message : "Sign-out failed. Check your connection and try again.",
      };
    }
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ session, isLoading, signOut }),
    [session, isLoading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function useRequireRole(allowed: UserRole[]): AuthSession | null {
  const { session, isLoading } = useAuth();
  if (isLoading) return null;
  if (!session) return null;
  return allowed.includes(session.role) ? session : null;
}
