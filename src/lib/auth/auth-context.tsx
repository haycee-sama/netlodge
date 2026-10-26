/**
 * Frontend authentication abstraction.
 *
 * IMPORTANT — read this before changing anything in this file.
 *
 * This module is a **frontend-only development convenience**. It exists so that
 * role-specific UI shells can be browsed during development without a live
 * Supabase project. It MUST NOT be treated as a security boundary.
 *
 * Security rules:
 *  - The role stored here is used purely to decide which UI shell to render.
 *  - Any privileged operation (verification approval, payout, room reservation,
 *    payment confirmation, ownership transfer, etc.) MUST be authorised by a
 *    trusted backend. The frontend never grants these.
 *  - Do not store anything here that you would not want a curious user to read
 *    from localStorage.
 *
 * The production adapter is documented in `/docs/integration-contracts.md` and
 * is expected to wrap `supabase-js` plus a server-side session exchange.
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
}

export interface AuthContextValue {
  /** Current session, or null when signed out. */
  session: DevSession | null;
  /** True until the session has been hydrated from storage on mount. */
  isLoading: boolean;
  /** Sign in with a development session. Does NOT call a real backend. */
  signIn: (input: { email: string; role: UserRole; firstName?: string; lastName?: string }) => DevSession;
  /** Switch role for the current development session (UI preview only). */
  switchRole: (role: UserRole) => void;
  signOut: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<DevSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Hydrate from localStorage on mount.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSession(JSON.parse(raw) as DevSession);
      }
    } catch {
      // Ignore malformed storage.
    } finally {
      setIsLoading(false);
    }
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
      // Storage unavailable — non-fatal in dev.
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

  const signOut = React.useCallback(() => persist(null), [persist]);

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

/** Convenience hook for guarding role-specific shells. */
export function useRequireRole(allowed: UserRole[]): DevSession | null {
  const { session, isLoading } = useAuth();
  if (isLoading) return null;
  if (!session) return null;
  return allowed.includes(session.role) ? session : null;
}
