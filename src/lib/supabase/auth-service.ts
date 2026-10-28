"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

/**
 * Supabase authentication service.
 *
 * Bridges the existing NetLodge auth context with Supabase Auth.
 * In production, all authentication is handled by Supabase Auth.
 * The dev adapter is kept as a fallback for local development without a backend.
 */

export interface SupabaseSession {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  issuedAt: string;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string; session?: SupabaseSession }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: "No user returned" };
    }

    // Fetch the user's role from the profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", data.user.id)
      .single();

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    // Prioritize non-student roles: if a user has both 'student' and
    // 'landlord' (or manager/agent), use the non-student role so they
    // land on the correct dashboard. Admin roles take priority over all.
    const rolePriority = [
      "super_admin", "finance_admin", "support_staff", "verification_officer",
      "landlord", "manager", "agent", "student",
    ];
    const userRoles = (roles ?? []).map((r: any) => r.role as string);
    const role: UserRole = (rolePriority.find((r) => userRoles.includes(r)) ?? "student") as UserRole;

    return {
      success: true,
      session: {
        userId: data.user.id,
        email: data.user.email ?? email,
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        role,
        issuedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          first_name: input.firstName,
          last_name: input.lastName,
          role: input.role ?? "student",
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // The handle_new_user trigger reads the role from user_metadata and
    // assigns it to the user. Marketplace roles (student, landlord, manager,
    // agent) are auto-assigned. Admin roles require manual assignment by
    // a super_admin via the admin user management interface.

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function signOut(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    // Non-fatal
  }
}

export async function resetPasswordForEmail(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function updatePassword(
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get the current session from Supabase.
 * Returns null if no session or if Supabase is not configured.
 */
export async function getCurrentSession(): Promise<SupabaseSession | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, status")
      .eq("id", user.id)
      .single();

    // Check if account is suspended
    if (profile?.status === "suspended" || profile?.status === "deactivated") {
      await supabase.auth.signOut();
      return null;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    // Prioritize non-student roles: if a user has both 'student' and
    // 'landlord' (or manager/agent), use the non-student role so they
    // land on the correct dashboard. Admin roles take priority over all.
    const rolePriority = [
      "super_admin", "finance_admin", "support_staff", "verification_officer",
      "landlord", "manager", "agent", "student",
    ];
    const userRoles = (roles ?? []).map((r: any) => r.role as string);
    const role: UserRole = (rolePriority.find((r) => userRoles.includes(r)) ?? "student") as UserRole;

    return {
      userId: user.id,
      email: user.email ?? "",
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      role,
      issuedAt: new Date().toISOString(),
    };
  } catch {
    // Supabase not configured or network error — return null
    return null;
  }
}
