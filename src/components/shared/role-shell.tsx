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
import { roleNavItems, homeRouteForRole, type UserRole } from "@/lib/auth/permissions";
import { initials } from "@/lib/utils/format";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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

  // Redirect to login if not signed in or wrong role.
  React.useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace(`/login?redirect=${pathname}`);
      return;
    }
    if (session.role !== role) {
      // Auto-switch to the role the route expects, since dev mode allows free switching.
      if ([ "student", "landlord", "manager", "agent"].includes(session.role)) {
        // Only allow switching if user is "allowed" to preview that role.
        // For demo simplicity, we let any user preview any role via this nav.
      }
      // Don't hard-redirect; let the user preview other roles.
    }
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

  const nav = roleNavItems(role);
  const roleLabel = role[0].toUpperCase() + role.slice(1);

  function handleSignOut() {
    signOut();
    router.push("/");
  }

  function handleSwitchRole(r: UserRole) {
    switchRole(r);
    router.push(homeRouteForRole(r));
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Link href="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label={`${roleLabel} sidebar`}>
        {nav.map((item) => {
          const Icon = iconMap[item.icon] ?? LayoutDashboard;
          const active = pathname === item.href || (item.href !== `/${role}` && pathname?.startsWith(item.href));
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
      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-lg sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
          </Sheet>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="capitalize">{roleLabel} workspace</Badge>
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
              <Link href={`/${role}/notifications`}>
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
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/${role}/profile`}>
                    <User className="mr-2 h-4 w-4" aria-hidden />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${role}/settings`}>
                    <Settings className="mr-2 h-4 w-4" aria-hidden />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Switch role (demo)
                </DropdownMenuLabel>
                {(["student", "landlord", "manager", "agent"] as UserRole[]).map((r) => (
                  <DropdownMenuItem key={r} onClick={() => handleSwitchRole(r)}>
                    <span className="mr-2 h-2 w-2 rounded-full bg-primary" aria-hidden />
                    <span className="capitalize">{r}</span>
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
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
