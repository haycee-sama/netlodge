/**
 * Permission model.
 *
 * The frontend uses these helpers to decide which UI affordances to *show*.
 * The backend MUST enforce the same rules independently — the frontend never
 * grants privileges. Roles reserved for future phases (verification_officer,
 * support_staff, finance_admin, super_admin) are listed here so the type
 * system stays extensible, but their dashboards are intentionally absent.
 */

import type { UserRole, ManagerPermission } from "@/lib/types";

export type Action =
  | "property:create"
  | "property:edit_own"
  | "property:edit_assigned"
  | "property:delete"
  | "room:create"
  | "room:bulk_edit"
  | "room:price_override"
  | "floor:manage"
  | "booking:view_own"
  | "booking:view_assigned"
  | "booking:cancel"
  | "availability:manage"
  | "verification:submit"
  | "verification:approve"
  | "payout:configure_account"
  | "payout:view"
  | "finance:view_own"
  | "finance:view_assigned"
  | "staff:manage"
  | "enquiry:manage"
  | "referral:view"
  | "inspection:record";

const LANDLORD_ACTIONS: Action[] = [
  "property:create",
  "property:edit_own",
  "property:delete",
  "room:create",
  "room:bulk_edit",
  "room:price_override",
  "floor:manage",
  "booking:view_own",
  "booking:cancel",
  "availability:manage",
  "verification:submit",
  "payout:configure_account",
  "payout:view",
  "finance:view_own",
  "staff:manage",
];

const MANAGER_ACTIONS: Action[] = [
  "property:edit_assigned",
  "room:create",
  "room:bulk_edit",
  "room:price_override",
  "floor:manage",
  "booking:view_assigned",
  "availability:manage",
  "inspection:record",
];

const AGENT_ACTIONS: Action[] = [
  "booking:view_assigned",
  "enquiry:manage",
  "referral:view",
];

const STUDENT_ACTIONS: Action[] = ["booking:view_own"];

export function can(role: UserRole | undefined, action: Action): boolean {
  if (!role) return false;
  switch (role) {
    case "landlord":
      return LANDLORD_ACTIONS.includes(action);
    case "manager":
      return MANAGER_ACTIONS.includes(action);
    case "agent":
      return AGENT_ACTIONS.includes(action);
    case "student":
      return STUDENT_ACTIONS.includes(action);
    default:
      return false;
  }
}

export function managerHasPermission(
  permissions: ManagerPermission[],
  permission: ManagerPermission,
): boolean {
  return permissions.includes(permission);
}

/** Home route for a given role, used after sign-in. */
export function homeRouteForRole(role: UserRole): string {
  switch (role) {
    case "landlord":
      return "/landlord";
    case "manager":
      return "/manager";
    case "agent":
      return "/agent";
    case "student":
    default:
      return "/student";
  }
}

/** Sidebar navigation items per role — see shared/role-shell.tsx for usage. */
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}

export function roleNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "student":
      return [
        { href: "/student", label: "Dashboard", icon: "LayoutDashboard" },
        { href: "/student/search", label: "Find accommodation", icon: "Search" },
        { href: "/student/saved", label: "Saved", icon: "Heart" },
        { href: "/student/bookings", label: "Bookings", icon: "CalendarCheck" },
        { href: "/student/payments", label: "Payments", icon: "CreditCard" },
        { href: "/student/notifications", label: "Notifications", icon: "Bell" },
        { href: "/student/support", label: "Support", icon: "LifeBuoy" },
        { href: "/student/profile", label: "Profile", icon: "User" },
        { href: "/student/security", label: "Security", icon: "ShieldCheck" },
        { href: "/student/settings", label: "Settings", icon: "Settings" },
      ];
    case "landlord":
      return [
        { href: "/landlord", label: "Dashboard", icon: "LayoutDashboard" },
        { href: "/landlord/onboarding", label: "Get started", icon: "Rocket" },
        { href: "/landlord/properties", label: "Properties", icon: "Building2" },
        { href: "/landlord/bookings", label: "Bookings", icon: "CalendarCheck" },
        { href: "/landlord/availability", label: "Availability", icon: "CalendarDays" },
        { href: "/landlord/pricing", label: "Pricing", icon: "Tag" },
        { href: "/landlord/transactions", label: "Transactions", icon: "Receipt" },
        { href: "/landlord/payouts", label: "Payouts", icon: "Banknote" },
        { href: "/landlord/staff", label: "Staff", icon: "Users" },
        { href: "/landlord/verification", label: "Verification", icon: "BadgeCheck" },
        { href: "/landlord/reports", label: "Reports", icon: "BarChart3" },
        { href: "/landlord/notifications", label: "Notifications", icon: "Bell" },
        { href: "/landlord/profile", label: "Profile", icon: "User" },
        { href: "/landlord/settings", label: "Settings", icon: "Settings" },
      ];
    case "manager":
      return [
        { href: "/manager", label: "Dashboard", icon: "LayoutDashboard" },
        { href: "/manager/properties", label: "Properties", icon: "Building2" },
        { href: "/manager/rooms", label: "Rooms", icon: "DoorOpen" },
        { href: "/manager/bookings", label: "Bookings", icon: "CalendarCheck" },
        { href: "/manager/availability", label: "Availability", icon: "CalendarDays" },
        { href: "/manager/inspections", label: "Inspections", icon: "ClipboardCheck" },
        { href: "/manager/notifications", label: "Notifications", icon: "Bell" },
        { href: "/manager/profile", label: "Profile", icon: "User" },
        { href: "/manager/settings", label: "Settings", icon: "Settings" },
      ];
    case "agent":
      return [
        { href: "/agent", label: "Dashboard", icon: "LayoutDashboard" },
        { href: "/agent/assignments", label: "Assignments", icon: "Briefcase" },
        { href: "/agent/properties", label: "Properties", icon: "Building2" },
        { href: "/agent/enquiries", label: "Enquiries", icon: "MessageSquare" },
        { href: "/agent/referrals", label: "Referrals", icon: "Share2" },
        { href: "/agent/notifications", label: "Notifications", icon: "Bell" },
        { href: "/agent/profile", label: "Profile", icon: "User" },
        { href: "/agent/settings", label: "Settings", icon: "Settings" },
      ];
    default:
      return [];
  }
}
