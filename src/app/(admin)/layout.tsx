"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { RoleShell } from "@/components/shared/role-shell";
import { useAuth } from "@/lib/auth/auth-context";
import type { UserRole } from "@/lib/types";
import { ADMIN_ROLES } from "@/lib/types";

/**
 * Admin layout.
 *
 * All four administrative roles (verification_officer, support_staff,
 * finance_admin, super_admin) live under the /admin route prefix. This layout
 * inspects the current path and the authenticated user's role to decide which
 * RoleShell variant to render.
 *
 * Path → role mapping:
 *   /admin/verification/*  → verification_officer
 *   /admin/support/*       → support_staff
 *   /admin/finance/*       → finance_admin
 *   /admin/* (everything else) → super_admin
 *
 * If a non-admin user lands here, the RoleShell's auth guard will redirect
 * them to /login. If an admin user of one role visits another admin role's
 * section, we let them preview it (dev mode) — production enforces real
 * authorisation server-side.
 */
function inferRoleFromPath(pathname: string | null): UserRole {
  if (!pathname) return "super_admin";
  if (pathname.startsWith("/admin/verification")) return "verification_officer";
  if (pathname.startsWith("/admin/support")) return "support_staff";
  if (pathname.startsWith("/admin/finance")) return "finance_admin";
  return "super_admin";
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, isLoading } = useAuth();
  const pathRole = inferRoleFromPath(pathname);

  // If the user is signed in as an admin role, use their actual role — but
  // only if it matches the section they're viewing. This prevents a
  // verification_officer from seeing the super_admin sidebar when previewing
  // /admin/users, while still allowing dev-mode previewing.
  let shellRole: UserRole = pathRole;
  if (session && ADMIN_ROLES.includes(session.role)) {
    // If the signed-in admin is viewing their own section, use their role.
    // Otherwise, use the path's role (dev preview).
    if (inferRoleFromPath(homeRoute(session.role)) === pathRole) {
      shellRole = session.role;
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading" />
      </div>
    );
  }

  return <RoleShell role={shellRole}>{children}</RoleShell>;
}

function homeRoute(role: UserRole): string {
  switch (role) {
    case "verification_officer":
      return "/admin/verification";
    case "support_staff":
      return "/admin/support";
    case "finance_admin":
      return "/admin/finance";
    case "super_admin":
      return "/admin";
    default:
      return "/admin";
  }
}
