/**
 * Frontend authentication abstraction.
 *
 * This module integrates with Supabase Auth when available, and falls back to
 * a dev-mode localStorage session for local development without a backend.
 *
 * Security rules:
 *  - The role stored here is used purely to decide which UI shell to render.
 *  - Any privileged operation MUST be authorised by a trusted backend.
 *  - The frontend never grants privileges.
 */

"use client";

import * as React from "react";
import type { UserRole } from "@/lib/types";

const STORAGE_KEY = "netlodge:auth:dev";
const ROLE_STORAGE_KEY = "netlodge:auth:role";

export interface DevSession {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  /** ISO timestamp when the dev session was created. */
  issuedAt: string;
  /** Whether this session is backed by Supabase Auth (true) or dev mode (false). */
  authenticated?: boolean;
}

export interface AuthContextValue {
  session: DevSession | null;
  isLoading: boolean;
  signIn: (input: { email: string; role: UserRole; firstName?: string; lastName?: string }) => DevSession;
  switchRole: (role: UserRole) => void;
  signOut: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<DevSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // On mount, try to get a Supabase session first, then fall back to dev mode.
  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      // Try Supabase Auth first
      try {
        const { getCurrentSession } = await import("@/lib/supabase/auth-service");
        const supabaseSession = await getCurrentSession();
        if (supabaseSession && !cancelled) {
          setSession({ ...supabaseSession, authenticated: true });
          setIsLoading(false);
          return;
        }
      } catch {
        // Supabase not configured or error — fall through to dev mode
      }

      // Fall back to dev mode (localStorage)
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setSession(JSON.parse(raw) as DevSession);
        }
      } catch {
        // Ignore malformed storage
      } finally {
        setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for Supabase auth state changes
  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function setupListener() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = supabase.auth.onAuthStateChange(async (event, authSession) => {
          if (event === "SIGNED_OUT") {
            setSession(null);
            // Clear dev mode too
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {}
          } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            if (authSession?.user) {
              const { getCurrentSession } = await import("@/lib/supabase/auth-service");
              const s = await getCurrentSession();
              if (s) {
                setSession({ ...s, authenticated: true });
              }
            }
          }
        });
        unsubscribe = data.subscription.unsubscribe;
      } catch {
        // Supabase not configured — skip
      }
    }

    setupListener();
    return () => {
      unsubscribe?.();
    };
  }, []);

  const persist = React.useCallback((next: DevSession | null) => {
    setSession(next);
    try {
      if (next) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        localStorage.setItem(ROLE_STORAGE_KEY, next.role);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ROLE_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable — non-fatal in dev
    }
  }, []);

  const signIn = React.useCallback<AuthContextValue["signIn"]>(
    (input) => {
      const next: DevSession = {
        userId: `dev_${input.email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        email: input.email,
        firstName: input.firstName ?? "Adaeze",
        lastName: input.lastName ?? "Okonkwo",
        role: input.role,
        issuedAt: new Date().toISOString(),
      };
      persist(next);
      return next;
    },
    [persist],
  );

  const switchRole = React.useCallback(
    (role: UserRole) => {
      setSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, role };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const signOut = React.useCallback(async () => {
    // Try Supabase sign out first
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Non-fatal
    }
    persist(null);
  }, [persist]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ session, isLoading, signIn, switchRole, signOut }),
    [session, isLoading, signIn, switchRole, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function useRequireRole(allowed: UserRole[]): DevSession | null {
  const { session, isLoading } = useAuth();
  if (isLoading) return null;
  if (!session) return null;
  return allowed.includes(session.role) ? session : null;
}
