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
import type { TranslationKey } from "@/lib/i18n/dictionaries";

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
  tKey?: TranslationKey;
}

/** Optional nav-group label, used to render collapsible groups in the sidebar. */
export interface NavGroup {
  label?: string;
  items: NavItem[];
  tKey?: TranslationKey;
}

export function roleNavItems(role: UserRole): NavItem[] {
  return roleNavGroups(role).flatMap((g) => g.items);
}

/** Grouped nav items — admin roles use groups; marketplace roles do not. */
export function roleNavGroups(role: UserRole): NavGroup[] {
  switch (role) {
    case "student":
      return [{ items: [
        { href: "/student", label: "Dashboard", icon: "LayoutDashboard", tKey: "nav.student.dashboard" },
        { href: "/student/search", label: "Find accommodation", icon: "Search", tKey: "nav.student.findAccommodation" },
        { href: "/student/saved", label: "Saved", icon: "Heart", tKey: "nav.student.saved" },
        { href: "/student/bookings", label: "Bookings", icon: "CalendarCheck", tKey: "nav.student.bookings" },
        { href: "/student/payments", label: "Payments", icon: "CreditCard", tKey: "nav.student.payments" },
        { href: "/student/notifications", label: "Notifications", icon: "Bell", tKey: "nav.student.notifications" },
        { href: "/student/support", label: "Support", icon: "LifeBuoy", tKey: "nav.student.support" },
        { href: "/student/profile", label: "Profile", icon: "User", tKey: "nav.student.profile" },
        { href: "/student/security", label: "Security", icon: "ShieldCheck", tKey: "nav.student.security" },
        { href: "/student/settings", label: "Settings", icon: "Settings", tKey: "nav.student.settings" },
      ]}];
    case "landlord":
      return [{ items: [
        { href: "/landlord", label: "Dashboard", icon: "LayoutDashboard", tKey: "nav.landlord.dashboard" },
        { href: "/landlord/onboarding", label: "Get started", icon: "Rocket", tKey: "nav.landlord.getStarted" },
        { href: "/landlord/properties", label: "Properties", icon: "Building2", tKey: "nav.landlord.properties" },
        { href: "/landlord/bookings", label: "Bookings", icon: "CalendarCheck", tKey: "nav.landlord.bookings" },
        { href: "/landlord/availability", label: "Availability", icon: "CalendarDays", tKey: "nav.landlord.availability" },
        { href: "/landlord/pricing", label: "Pricing", icon: "Tag", tKey: "nav.landlord.pricing" },
        { href: "/landlord/transactions", label: "Transactions", icon: "Receipt", tKey: "nav.landlord.transactions" },
        { href: "/landlord/payouts", label: "Payouts", icon: "Banknote", tKey: "nav.landlord.payouts" },
        { href: "/landlord/staff", label: "Staff", icon: "Users", tKey: "nav.landlord.staff" },
        { href: "/landlord/verification", label: "Verification", icon: "BadgeCheck", tKey: "nav.landlord.verification" },
        { href: "/landlord/reports", label: "Reports", icon: "BarChart3", tKey: "nav.landlord.reports" },
        { href: "/landlord/notifications", label: "Notifications", icon: "Bell", tKey: "nav.landlord.notifications" },
        { href: "/landlord/profile", label: "Profile", icon: "User", tKey: "nav.landlord.profile" },
        { href: "/landlord/settings", label: "Settings", icon: "Settings", tKey: "nav.landlord.settings" },
      ]}];
    case "manager":
      return [{ items: [
        { href: "/manager", label: "Dashboard", icon: "LayoutDashboard", tKey: "nav.manager.dashboard" },
        { href: "/manager/properties", label: "Properties", icon: "Building2", tKey: "nav.manager.properties" },
        { href: "/manager/rooms", label: "Rooms", icon: "DoorOpen", tKey: "nav.manager.rooms" },
        { href: "/manager/bookings", label: "Bookings", icon: "CalendarCheck", tKey: "nav.manager.bookings" },
        { href: "/manager/availability", label: "Availability", icon: "CalendarDays", tKey: "nav.manager.availability" },
        { href: "/manager/inspections", label: "Inspections", icon: "ClipboardCheck", tKey: "nav.manager.inspections" },
        { href: "/manager/notifications", label: "Notifications", icon: "Bell", tKey: "nav.manager.notifications" },
        { href: "/manager/profile", label: "Profile", icon: "User", tKey: "nav.manager.profile" },
        { href: "/manager/settings", label: "Settings", icon: "Settings", tKey: "nav.manager.settings" },
      ]}];
    case "agent":
      return [{ items: [
        { href: "/agent", label: "Dashboard", icon: "LayoutDashboard", tKey: "nav.agent.dashboard" },
        { href: "/agent/assignments", label: "Assignments", icon: "Briefcase", tKey: "nav.agent.assignments" },
        { href: "/agent/properties", label: "Properties", icon: "Building2", tKey: "nav.agent.properties" },
        { href: "/agent/enquiries", label: "Enquiries", icon: "MessageSquare", tKey: "nav.agent.enquiries" },
        { href: "/agent/referrals", label: "Referrals", icon: "Share2", tKey: "nav.agent.referrals" },
        { href: "/agent/notifications", label: "Notifications", icon: "Bell", tKey: "nav.agent.notifications" },
        { href: "/agent/profile", label: "Profile", icon: "User", tKey: "nav.agent.profile" },
        { href: "/agent/settings", label: "Settings", icon: "Settings", tKey: "nav.agent.settings" },
      ]}];
    case "verification_officer":
      return [
        { label: "Workspace", tKey: "nav.group.workspace", items: [
          { href: "/admin/verification", label: "Dashboard", icon: "LayoutDashboard", tKey: "shell.dashboard" },
          { href: "/admin/verification/queue", label: "Review queue", icon: "ListChecks", tKey: "nav.verificationOfficer.reviewQueue" },
        ]},
        { label: "Submissions", tKey: "nav.group.submissions", items: [
          { href: "/admin/verification/students", label: "Student KYC", icon: "GraduationCap", tKey: "nav.verificationOfficer.studentKyc" },
          { href: "/admin/verification/landlords", label: "Landlords", icon: "Building2", tKey: "nav.verificationOfficer.landlords" },
          { href: "/admin/verification/properties", label: "Properties", icon: "Home", tKey: "nav.verificationOfficer.properties" },
          { href: "/admin/verification/rooms", label: "Room evidence", icon: "DoorOpen", tKey: "nav.verificationOfficer.roomEvidence" },
        ]},
        { label: "Operations", tKey: "nav.group.operations", items: [
          { href: "/admin/verification/escalations", label: "Escalations", icon: "ArrowUpCircle", tKey: "nav.verificationOfficer.escalations" },
          { href: "/admin/verification/history", label: "Decision history", icon: "History", tKey: "nav.verificationOfficer.decisionHistory" },
          { href: "/admin/verification/notifications", label: "Notifications", icon: "Bell", tKey: "nav.student.notifications" },
        ]},
        { label: "Account", tKey: "nav.group.account", items: [
          { href: "/admin/verification/profile", label: "Profile", icon: "User", tKey: "shell.profile" },
          { href: "/admin/verification/settings", label: "Settings", icon: "Settings", tKey: "shell.settings" },
        ]},
      ];
    case "support_staff":
      return [
        { label: "Workspace", tKey: "nav.group.workspace", items: [
          { href: "/admin/support", label: "Dashboard", icon: "LayoutDashboard", tKey: "shell.dashboard" },
          { href: "/admin/support/tickets", label: "Tickets", icon: "Ticket", tKey: "nav.supportStaff.tickets" },
          { href: "/admin/support/conversations", label: "Conversations", icon: "MessagesSquare", tKey: "nav.supportStaff.conversations" },
        ]},
        { label: "Operations", tKey: "nav.group.operations", items: [
          { href: "/admin/support/customers", label: "Customers", icon: "Users", tKey: "nav.supportStaff.customers" },
          { href: "/admin/support/escalations", label: "Escalations", icon: "ArrowUpCircle", tKey: "nav.supportStaff.escalations" },
          { href: "/admin/support/knowledge-base", label: "Knowledge base", icon: "BookOpen", tKey: "nav.supportStaff.knowledgeBase" },
          { href: "/admin/support/reports", label: "Reports", icon: "BarChart3", tKey: "nav.supportStaff.reports" },
          { href: "/admin/support/notifications", label: "Notifications", icon: "Bell", tKey: "nav.student.notifications" },
        ]},
        { label: "Account", tKey: "nav.group.account", items: [
          { href: "/admin/support/profile", label: "Profile", icon: "User", tKey: "shell.profile" },
          { href: "/admin/support/settings", label: "Settings", icon: "Settings", tKey: "shell.settings" },
        ]},
      ];
    case "finance_admin":
      return [
        { label: "Workspace", tKey: "nav.group.workspace", items: [
          { href: "/admin/finance", label: "Dashboard", icon: "LayoutDashboard", tKey: "shell.dashboard" },
          { href: "/admin/finance/transactions", label: "Transactions", icon: "Receipt", tKey: "nav.financeAdmin.transactions" },
          { href: "/admin/finance/payments", label: "Payments", icon: "CreditCard", tKey: "nav.financeAdmin.payments" },
        ]},
        { label: "Money movement", tKey: "nav.group.operations", items: [
          { href: "/admin/finance/refunds", label: "Refunds", icon: "RotateCcw", tKey: "nav.financeAdmin.refunds" },
          { href: "/admin/finance/payouts", label: "Payouts", icon: "Banknote", tKey: "nav.financeAdmin.payouts" },
          { href: "/admin/finance/commissions", label: "Commissions", icon: "Percent", tKey: "nav.financeAdmin.commissions" },
        ]},
        { label: "Controls", tKey: "nav.group.trustSystem", items: [
          { href: "/admin/finance/reconciliation", label: "Reconciliation", icon: "Scale", tKey: "nav.financeAdmin.reconciliation" },
          { href: "/admin/finance/disputes", label: "Disputes", icon: "AlertTriangle", tKey: "nav.financeAdmin.disputes" },
          { href: "/admin/finance/reports", label: "Reports", icon: "BarChart3", tKey: "nav.financeAdmin.reports" },
          { href: "/admin/finance/audit", label: "Audit trail", icon: "ScrollText", tKey: "nav.financeAdmin.auditTrail" },
          { href: "/admin/finance/notifications", label: "Notifications", icon: "Bell", tKey: "nav.student.notifications" },
        ]},
        { label: "Account", tKey: "nav.group.account", items: [
          { href: "/admin/finance/profile", label: "Profile", icon: "User", tKey: "shell.profile" },
          { href: "/admin/finance/settings", label: "Settings", icon: "Settings", tKey: "shell.settings" },
        ]},
      ];
    case "super_admin":
      return [
        { label: "Platform", tKey: "nav.group.platform", items: [
          { href: "/admin", label: "Overview", icon: "LayoutDashboard", tKey: "nav.superAdmin.overview" },
          { href: "/admin/users", label: "Users", icon: "Users", tKey: "nav.superAdmin.users" },
          { href: "/admin/roles", label: "Roles & permissions", icon: "KeyRound", tKey: "nav.superAdmin.rolesPermissions" },
          { href: "/admin/staff", label: "Staff", icon: "UserCog", tKey: "nav.superAdmin.staff" },
        ]},
        { label: "Marketplace oversight", tKey: "nav.group.marketplaceOversight", items: [
          { href: "/admin/properties", label: "Properties", icon: "Building2", tKey: "nav.landlord.properties" },
          { href: "/admin/rooms", label: "Rooms", icon: "DoorOpen", tKey: "nav.manager.rooms" },
          { href: "/admin/bookings", label: "Bookings", icon: "CalendarCheck", tKey: "nav.student.bookings" },
          { href: "/admin/verifications", label: "Verifications", icon: "BadgeCheck", tKey: "nav.superAdmin.verifications" },
          { href: "/admin/support", label: "Support", icon: "LifeBuoy", tKey: "nav.superAdmin.support" },
          { href: "/admin/finance", label: "Finance", icon: "Wallet", tKey: "nav.superAdmin.finance" },
        ]},
        { label: "Configuration", tKey: "nav.group.configuration", items: [
          { href: "/admin/universities", label: "Universities", icon: "GraduationCap", tKey: "nav.superAdmin.universities" },
          { href: "/admin/locations", label: "Locations", icon: "MapPin", tKey: "nav.superAdmin.locations" },
          { href: "/admin/facilities", label: "Facilities", icon: "Sparkles", tKey: "nav.superAdmin.facilities" },
          { href: "/admin/commissions", label: "Commissions", icon: "Percent", tKey: "nav.superAdmin.commissions" },
          { href: "/admin/testimonials", label: "Testimonials", icon: "MessageSquare", tKey: "nav.superAdmin.testimonials" },
          { href: "/admin/announcements", label: "Announcements", icon: "Megaphone", tKey: "nav.superAdmin.announcements" },
        ]},
        { label: "Trust & system", tKey: "nav.group.trustSystem", items: [
          { href: "/admin/reports", label: "Reports", icon: "BarChart3", tKey: "nav.superAdmin.overview" },
          { href: "/admin/audit-logs", label: "Audit logs", icon: "ScrollText", tKey: "nav.superAdmin.auditLogs" },
          { href: "/admin/security", label: "Security", icon: "ShieldCheck", tKey: "nav.superAdmin.security" },
          { href: "/admin/integrations", label: "Integrations", icon: "Plug", tKey: "nav.superAdmin.integrations" },
          { href: "/admin/system-health", label: "System health", icon: "Activity", tKey: "nav.superAdmin.systemHealth" },
          { href: "/admin/settings", label: "Settings", icon: "Settings", tKey: "shell.settings" },
          { href: "/admin/profile", label: "Profile", icon: "User", tKey: "shell.profile" },
        ]},
      ];
    default:
      return [];
  }
}
