/**
 * Permission model.
 *
 * The frontend uses these helpers to decide which UI affordances to *show*.
 * The backend MUST enforce the same rules independently — the frontend never
 * grants privileges.
 *
 * Role taxonomy:
 *  - Marketplace roles: student, landlord, manager, agent
 *  - Administrative roles: verification_officer, support_staff, finance_admin,
 *    super_admin
 *
 * Each administrative role is deny-by-default for everything outside its
 * whitelist. High-risk actions (issuing refunds, approving payouts, changing
 * another admin's permissions) additionally require server-side reauth and
 * audit logging — those guards live in the production adapter, not here.
 */

import type { UserRole, ManagerPermission } from "@/lib/types";

export type Action =
  // Marketplace — properties & inventory
  | "property:create"
  | "property:edit_own"
  | "property:edit_assigned"
  | "property:delete"
  | "property:view_all"
  | "room:create"
  | "room:bulk_edit"
  | "room:price_override"
  | "floor:manage"
  // Marketplace — bookings
  | "booking:view_own"
  | "booking:view_assigned"
  | "booking:view_all"
  | "booking:cancel"
  | "availability:manage"
  // Verification (marketplace side)
  | "verification:submit"
  // Verification (officer side)
  | "verification:review"
  | "verification:approve"
  | "verification:reject"
  | "verification:assign"
  | "verification:escalate"
  | "verification:record_inspection"
  | "verification:view_history"
  // Support
  | "support:view_own"
  | "support:view_all"
  | "support:assign"
  | "support:reply_as_staff"
  | "support:escalate"
  | "support:manage_kb"
  // Finance
  | "payout:configure_account"
  | "payout:view"
  | "payout:view_all"
  | "payout:approve"
  | "payout:reject"
  | "payout:reverse"
  | "finance:view_own"
  | "finance:view_assigned"
  | "finance:view_all"
  | "finance:refund:approve"
  | "finance:refund:reject"
  | "finance:reconcile"
  | "finance:view_audit"
  // Super admin
  | "admin:manage_users"
  | "admin:manage_roles"
  | "admin:manage_staff"
  | "admin:manage_settings"
  | "admin:view_audit"
  | "admin:manage_integrations"
  | "admin:view_reports"
  | "admin:manage_universities"
  | "admin:manage_facilities"
  | "admin:manage_commissions"
  | "admin:manage_notifications"
  // Marketplace — staff
  | "staff:manage"
  | "enquiry:manage"
  | "referral:view"
  | "inspection:record";

/* ------------------------------------------------------------------ Marketplace */

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

const STUDENT_ACTIONS: Action[] = ["booking:view_own", "support:view_own"];

/* ------------------------------------------------------------------ Verification Officer */

const VERIFICATION_OFFICER_ACTIONS: Action[] = [
  "verification:review",
  "verification:approve",
  "verification:reject",
  "verification:assign",
  "verification:escalate",
  "verification:record_inspection",
  "verification:view_history",
  "support:view_all", // read-only access to related tickets
];

/* ------------------------------------------------------------------ Support Staff */

const SUPPORT_STAFF_ACTIONS: Action[] = [
  "support:view_all",
  "support:assign",
  "support:reply_as_staff",
  "support:escalate",
  "support:manage_kb",
  "verification:review", // can flag verification-related tickets, not approve
];

/* ------------------------------------------------------------------ Finance Administrator */

const FINANCE_ADMIN_ACTIONS: Action[] = [
  "finance:view_all",
  "payout:view_all",
  "payout:approve",
  "payout:reject",
  "payout:reverse",
  "finance:refund:approve",
  "finance:refund:reject",
  "finance:reconcile",
  "finance:view_audit",
  "booking:view_all",
  "property:view_all",
];

/* ------------------------------------------------------------------ Super Administrator */

/**
 * Super admins have the broadest access, but they still do NOT get every
 * action — for example, they cannot fabricate payments or delete audit logs.
 * Those operations are simply not exposed as Actions at all.
 */
const SUPER_ADMIN_ACTIONS: Action[] = [
  // Inherit the finance admin's read access
  "finance:view_all",
  "payout:view_all",
  "finance:view_audit",
  "booking:view_all",
  "property:view_all",
  // Inherit verification oversight
  "verification:review",
  "verification:view_history",
  "verification:escalate",
  // Inherit support oversight
  "support:view_all",
  // User & role management
  "admin:manage_users",
  "admin:manage_roles",
  "admin:manage_staff",
  "admin:manage_settings",
  "admin:view_audit",
  "admin:manage_integrations",
  "admin:view_reports",
  "admin:manage_universities",
  "admin:manage_facilities",
  "admin:manage_commissions",
  "admin:manage_notifications",
];

const ROLE_ACTIONS: Record<UserRole, Action[]> = {
  student: STUDENT_ACTIONS,
  landlord: LANDLORD_ACTIONS,
  manager: MANAGER_ACTIONS,
  agent: AGENT_ACTIONS,
  verification_officer: VERIFICATION_OFFICER_ACTIONS,
  support_staff: SUPPORT_STAFF_ACTIONS,
  finance_admin: FINANCE_ADMIN_ACTIONS,
  super_admin: SUPER_ADMIN_ACTIONS,
};

/**
 * Returns true if `role` is permitted to perform `action`.
 *
 * This is a UI affordance check only. The backend MUST enforce the same rules
 * independently (via Supabase RLS policies + server-action guards).
 */
export function can(role: UserRole | undefined, action: Action): boolean {
  if (!role) return false;
  const allowed = ROLE_ACTIONS[role];
  return allowed ? allowed.includes(action) : false;
}

export function managerHasPermission(
  permissions: ManagerPermission[],
  permission: ManagerPermission,
): boolean {
  return permissions.includes(permission);
}

/* ------------------------------------------------------------------ Routes */

/** Home route for a given role, used after sign-in. */
export function homeRouteForRole(role: UserRole): string {
  switch (role) {
    case "landlord":
      return "/landlord";
    case "manager":
      return "/manager";
    case "agent":
      return "/agent";
    case "verification_officer":
      return "/admin/verification";
    case "support_staff":
      return "/admin/support";
    case "finance_admin":
      return "/admin/finance";
    case "super_admin":
      return "/admin";
    case "student":
    default:
      return "/student";
  }
}

/* ------------------------------------------------------------------ Navigation */

/** Sidebar navigation items per role — see shared/role-shell.tsx for usage. */
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}

/** Optional nav-group label, used to render collapsible groups in the sidebar. */
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export function roleNavItems(role: UserRole): NavItem[] {
  return roleNavGroups(role).flatMap((g) => g.items);
}

/** Grouped nav items — admin roles use groups; marketplace roles do not. */
export function roleNavGroups(role: UserRole): NavGroup[] {
  switch (role) {
    case "student":
      return [{ items: [
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
      ]}];
    case "landlord":
      return [{ items: [
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
      ]}];
    case "manager":
      return [{ items: [
        { href: "/manager", label: "Dashboard", icon: "LayoutDashboard" },
        { href: "/manager/properties", label: "Properties", icon: "Building2" },
        { href: "/manager/rooms", label: "Rooms", icon: "DoorOpen" },
        { href: "/manager/bookings", label: "Bookings", icon: "CalendarCheck" },
        { href: "/manager/availability", label: "Availability", icon: "CalendarDays" },
        { href: "/manager/inspections", label: "Inspections", icon: "ClipboardCheck" },
        { href: "/manager/notifications", label: "Notifications", icon: "Bell" },
        { href: "/manager/profile", label: "Profile", icon: "User" },
        { href: "/manager/settings", label: "Settings", icon: "Settings" },
      ]}];
    case "agent":
      return [{ items: [
        { href: "/agent", label: "Dashboard", icon: "LayoutDashboard" },
        { href: "/agent/assignments", label: "Assignments", icon: "Briefcase" },
        { href: "/agent/properties", label: "Properties", icon: "Building2" },
        { href: "/agent/enquiries", label: "Enquiries", icon: "MessageSquare" },
        { href: "/agent/referrals", label: "Referrals", icon: "Share2" },
        { href: "/agent/notifications", label: "Notifications", icon: "Bell" },
        { href: "/agent/profile", label: "Profile", icon: "User" },
        { href: "/agent/settings", label: "Settings", icon: "Settings" },
      ]}];
    case "verification_officer":
      return [
        { label: "Workspace", items: [
          { href: "/admin/verification", label: "Dashboard", icon: "LayoutDashboard" },
          { href: "/admin/verification/queue", label: "Review queue", icon: "ListChecks" },
        ]},
        { label: "Submissions", items: [
          { href: "/admin/verification/students", label: "Student KYC", icon: "GraduationCap" },
          { href: "/admin/verification/landlords", label: "Landlords", icon: "Building2" },
          { href: "/admin/verification/properties", label: "Properties", icon: "Home" },
          { href: "/admin/verification/rooms", label: "Room evidence", icon: "DoorOpen" },
        ]},
        { label: "Operations", items: [
          { href: "/admin/verification/escalations", label: "Escalations", icon: "ArrowUpCircle" },
          { href: "/admin/verification/history", label: "Decision history", icon: "History" },
          { href: "/admin/verification/notifications", label: "Notifications", icon: "Bell" },
        ]},
        { label: "Account", items: [
          { href: "/admin/verification/profile", label: "Profile", icon: "User" },
          { href: "/admin/verification/settings", label: "Settings", icon: "Settings" },
        ]},
      ];
    case "support_staff":
      return [
        { label: "Workspace", items: [
          { href: "/admin/support", label: "Dashboard", icon: "LayoutDashboard" },
          { href: "/admin/support/tickets", label: "Tickets", icon: "Ticket" },
          { href: "/admin/support/conversations", label: "Conversations", icon: "MessagesSquare" },
        ]},
        { label: "Operations", items: [
          { href: "/admin/support/customers", label: "Customers", icon: "Users" },
          { href: "/admin/support/escalations", label: "Escalations", icon: "ArrowUpCircle" },
          { href: "/admin/support/knowledge-base", label: "Knowledge base", icon: "BookOpen" },
          { href: "/admin/support/reports", label: "Reports", icon: "BarChart3" },
          { href: "/admin/support/notifications", label: "Notifications", icon: "Bell" },
        ]},
        { label: "Account", items: [
          { href: "/admin/support/profile", label: "Profile", icon: "User" },
          { href: "/admin/support/settings", label: "Settings", icon: "Settings" },
        ]},
      ];
    case "finance_admin":
      return [
        { label: "Workspace", items: [
          { href: "/admin/finance", label: "Dashboard", icon: "LayoutDashboard" },
          { href: "/admin/finance/transactions", label: "Transactions", icon: "Receipt" },
          { href: "/admin/finance/payments", label: "Payments", icon: "CreditCard" },
        ]},
        { label: "Money movement", items: [
          { href: "/admin/finance/refunds", label: "Refunds", icon: "RotateCcw" },
          { href: "/admin/finance/payouts", label: "Payouts", icon: "Banknote" },
          { href: "/admin/finance/commissions", label: "Commissions", icon: "Percent" },
        ]},
        { label: "Controls", items: [
          { href: "/admin/finance/reconciliation", label: "Reconciliation", icon: "Scale" },
          { href: "/admin/finance/disputes", label: "Disputes", icon: "AlertTriangle" },
          { href: "/admin/finance/reports", label: "Reports", icon: "BarChart3" },
          { href: "/admin/finance/audit", label: "Audit trail", icon: "ScrollText" },
          { href: "/admin/finance/notifications", label: "Notifications", icon: "Bell" },
        ]},
        { label: "Account", items: [
          { href: "/admin/finance/profile", label: "Profile", icon: "User" },
          { href: "/admin/finance/settings", label: "Settings", icon: "Settings" },
        ]},
      ];
    case "super_admin":
      return [
        { label: "Platform", items: [
          { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
          { href: "/admin/users", label: "Users", icon: "Users" },
          { href: "/admin/roles", label: "Roles & permissions", icon: "KeyRound" },
          { href: "/admin/staff", label: "Staff", icon: "UserCog" },
        ]},
        { label: "Marketplace oversight", items: [
          { href: "/admin/properties", label: "Properties", icon: "Building2" },
          { href: "/admin/rooms", label: "Rooms", icon: "DoorOpen" },
          { href: "/admin/bookings", label: "Bookings", icon: "CalendarCheck" },
          { href: "/admin/verifications", label: "Verifications", icon: "BadgeCheck" },
          { href: "/admin/support", label: "Support", icon: "LifeBuoy" },
          { href: "/admin/finance", label: "Finance", icon: "Wallet" },
        ]},
        { label: "Configuration", items: [
          { href: "/admin/universities", label: "Universities", icon: "GraduationCap" },
          { href: "/admin/locations", label: "Locations", icon: "MapPin" },
          { href: "/admin/facilities", label: "Facilities", icon: "Sparkles" },
          { href: "/admin/commissions", label: "Commissions", icon: "Percent" },
          { href: "/admin/announcements", label: "Announcements", icon: "Megaphone" },
        ]},
        { label: "Trust & system", items: [
          { href: "/admin/reports", label: "Reports", icon: "BarChart3" },
          { href: "/admin/audit-logs", label: "Audit logs", icon: "ScrollText" },
          { href: "/admin/security", label: "Security", icon: "ShieldCheck" },
          { href: "/admin/integrations", label: "Integrations", icon: "Plug" },
          { href: "/admin/system-health", label: "System health", icon: "Activity" },
          { href: "/admin/settings", label: "Settings", icon: "Settings" },
          { href: "/admin/profile", label: "Profile", icon: "User" },
        ]},
      ];
    default:
      return [];
  }
}
