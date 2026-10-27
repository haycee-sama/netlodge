"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Heart,
  CalendarCheck,
  CreditCard,
  Bell,
  LifeBuoy,
  User,
  ShieldCheck,
  Settings,
  Building2,
  Rocket,
  CalendarDays,
  Tag,
  Receipt,
  Banknote,
  Users,
  BadgeCheck,
  BarChart3,
  DoorOpen,
  ClipboardCheck,
  Briefcase,
  MessageSquare,
  Share2,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ExternalLink,
  Home,
  // Admin icons
  ListChecks,
  GraduationCap,
  ArrowUpCircle,
  History,
  Ticket,
  MessagesSquare,
  BookOpen,
  RotateCcw,
  Percent,
  Scale,
  AlertTriangle,
  ScrollText,
  KeyRound,
  UserCog,
  Wallet,
  MapPin,
  Sparkles,
  Megaphone,
  Plug,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";
import {
  roleNavGroups,
  roleNavItems,
  homeRouteForRole,
  type UserRole,
} from "@/lib/auth/permissions";
import {
  MARKETPLACE_ROLES,
  ADMIN_ROLES,
  roleLabel as formatRoleLabel,
} from "@/lib/types";
import { initials } from "@/lib/utils/format";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Search, Heart, CalendarCheck, CreditCard, Bell, LifeBuoy,
  User, ShieldCheck, Settings, Building2, Rocket, CalendarDays, Tag, Receipt,
  Banknote, Users, BadgeCheck, BarChart3, DoorOpen, ClipboardCheck, Briefcase,
  MessageSquare, Share2,
  // Admin icons
  ListChecks, GraduationCap, ArrowUpCircle, History, Ticket, MessagesSquare,
  BookOpen, RotateCcw, Percent, Scale, AlertTriangle, ScrollText, KeyRound,
  UserCog, Wallet, MapPin, Sparkles, Megaphone, Plug, Activity,
};

interface RoleShellProps {
  role: UserRole;
  children: React.ReactNode;
}

export function RoleShell({ role, children }: RoleShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isLoading, signOut, switchRole } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Redirect to login if not signed in.
  React.useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace(`/login?redirect=${pathname}`);
      return;
    }
    // In dev mode, we let any signed-in user preview any role's shell — the
    // production backend enforces real authorisation. We do NOT auto-switch
    // the session role here; the user must explicitly switch via the menu.
  }, [isLoading, session, role, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading" />
      </div>
    );
  }

  if (!session) {
    return null; // redirect in effect
  }

  const groups = roleNavGroups(role);
  const nav = roleNavItems(role);
  const roleLabel = formatRoleLabel(role);

  // Determine the notifications route for the bell icon — admin roles all
  // have a per-role notifications page under their admin namespace.
  const notificationsHref =
    role === "verification_officer"
      ? "/admin/verification/notifications"
      : role === "support_staff"
        ? "/admin/support/notifications"
        : role === "finance_admin"
          ? "/admin/finance/notifications"
          : role === "super_admin"
            ? "/admin/notifications"
            : `/${role}/notifications`;

  const profileHref =
    role === "verification_officer"
      ? "/admin/verification/profile"
      : role === "support_staff"
        ? "/admin/support/profile"
        : role === "finance_admin"
          ? "/admin/finance/profile"
          : role === "super_admin"
            ? "/admin/profile"
            : `/${role}/profile`;

  const settingsHref =
    role === "verification_officer"
      ? "/admin/verification/settings"
      : role === "support_staff"
        ? "/admin/support/settings"
        : role === "finance_admin"
          ? "/admin/finance/settings"
          : role === "super_admin"
            ? "/admin/settings"
            : `/${role}/settings`;

  function handleSignOut() {
    signOut();
    router.push("/");
  }

  function handleSwitchRole(r: UserRole) {
    switchRole(r);
    router.push(homeRouteForRole(r));
  }

  // Active-link check: a nav item is active if its href exactly matches the
  // pathname, OR the pathname starts with the href AND the href is not the
  // role's home route (so the home route only highlights on its own page).
  const homeHref = homeRouteForRole(role);
  function isActive(href: string): boolean {
    if (pathname === href) return true;
    if (href === homeHref) return false; // home only highlights on exact match
    return !!pathname?.startsWith(href + "/") || pathname === href;
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Link href="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto p-3" aria-label={`${roleLabel} sidebar`}>
        {groups.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            {group.label && (
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = iconMap[item.icon] ?? LayoutDashboard;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && <Badge variant="secondary" className="h-5 text-xs">{item.badge}</Badge>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Home className="h-4 w-4" aria-hidden />
          Back to site
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-sidebar lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">{roleLabel} navigation</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 overflow-x-hidden border-b border-border bg-background/85 px-4 backdrop-blur-lg sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden shrink-0" aria-label="Open menu">
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
          </Sheet>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 shrink-0",
                ADMIN_ROLES.includes(role) && "border-primary/40 bg-primary/5 text-primary",
              )}
            >
              {ADMIN_ROLES.includes(role) && <ShieldCheck className="h-3 w-3" aria-hidden />}
              <span className="hidden sm:inline">{roleLabel} workspace</span>
              <span className="sm:hidden">Admin</span>
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" aria-hidden />
                View site
              </Link>
            </Button>
            <ThemeToggle compact />
            <Button asChild variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Link href={notificationsHref}>
                <Bell className="h-4 w-4" aria-hidden />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" aria-hidden />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 pl-1.5">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials(session.firstName, session.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">
                    {session.firstName}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="space-y-0.5">
                  <div className="text-sm font-medium">{session.firstName} {session.lastName}</div>
                  <div className="truncate text-xs text-muted-foreground">{session.email}</div>
                  <div className="pt-1">
                    <Badge variant="outline" className="text-[10px]">{roleLabel}</Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={profileHref}>
                    <User className="mr-2 h-4 w-4" aria-hidden />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={settingsHref}>
                    <Settings className="mr-2 h-4 w-4" aria-hidden />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Marketplace roles (demo)
                </DropdownMenuLabel>
                {MARKETPLACE_ROLES.map((r) => (
                  <DropdownMenuItem key={r} onClick={() => handleSwitchRole(r)}>
                    <span className="mr-2 h-2 w-2 rounded-full bg-muted-foreground/50" aria-hidden />
                    <span>{formatRoleLabel(r)}</span>
                    {r === session.role && <Badge variant="secondary" className="ml-auto">current</Badge>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Administrative roles (demo)
                </DropdownMenuLabel>
                {ADMIN_ROLES.map((r) => (
                  <DropdownMenuItem key={r} onClick={() => handleSwitchRole(r)}>
                    <ShieldCheck className="mr-2 h-3.5 w-3.5 text-primary" aria-hidden />
                    <span>{formatRoleLabel(r)}</span>
                    {r === session.role && <Badge variant="secondary" className="ml-auto">current</Badge>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="main" className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
