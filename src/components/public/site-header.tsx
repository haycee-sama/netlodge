"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Search,
  Building2,
  GraduationCap,
  ShieldCheck,
  HelpCircle,
  LayoutDashboard,
  ChevronDown,
  Sparkles,
  LogOut,
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
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { homeRouteForRole } from "@/lib/auth/permissions";

const navItemDefs = [
  { href: "/search", tKey: "nav.search", icon: Search },
  { href: "/universities", tKey: "nav.universities", icon: GraduationCap },
  { href: "/properties", tKey: "nav.properties", icon: Building2 },
  { href: "/how-it-works", tKey: "nav.howItWorks" },
  { href: "/safety", tKey: "nav.safety", icon: ShieldCheck },
  { href: "/help", tKey: "nav.help", icon: HelpCircle },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const { session, signOut } = useAuth();
  const { t } = useI18n();
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const result = await signOut();
      if (!result.success) {
        const { toast } = await import("sonner");
        toast.error(t("shell.couldNotSignOut"), {
          description: result.error ?? t("shell.couldNotSignOutDesc"),
        });
        return;
      }
    } finally {
      setSigningOut(false);
    }
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Mobile menu trigger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={t("nav.openMenu")}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full max-w-xs p-0">
            <SheetTitle className="sr-only">{t("nav.navigationMenu")}</SheetTitle>
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo />
              <SheetClose asChild>
                <Button variant="ghost" size="icon" aria-label={t("nav.closeMenu")}>
                  <X className="h-5 w-5" aria-hidden />
                </Button>
              </SheetClose>
            </div>
            <nav className="flex flex-col gap-1 p-3" aria-label={t("nav.primaryNav")}>
              {navItemDefs.map((item) => (
                <SheetClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {"icon" in item && item.icon ? <item.icon className="h-4 w-4" aria-hidden /> : null}
                    {t(item.tKey)}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto space-y-2 border-t border-border p-3">
              {session ? (
                <>
                  <SheetClose asChild>
                    <Button asChild className="w-full">
                      <Link href={homeRouteForRole(session.role)}>
                        <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden />
                        {t("nav.goToDashboard")}
                      </Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleSignOut}
                      disabled={signingOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" aria-hidden />
                      {signingOut ? t("nav.signingOut") : t("nav.signOut")}
                    </Button>
                  </SheetClose>
                </>
              ) : (
                <>
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/login">{t("nav.signIn")}</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild className="w-full">
                      <Link href="/register">
                        <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                        {t("nav.getStarted")}
                      </Link>
                    </Button>
                  </SheetClose>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav
          className="ml-4 hidden items-center gap-0.5 lg:flex"
          aria-label={t("nav.primaryNav")}
        >
          {navItemDefs.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground",
              )}
            >
              {t(item.tKey)}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1.5">
          <LanguageSwitcher compact />
          <ThemeToggle compact />
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <LayoutDashboard className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{t("nav.dashboard")}</span>
                  <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {t("nav.signedInAs")}
                  <div className="truncate text-foreground">{session.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={homeRouteForRole(session.role)}>
                    <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden />
                    {session.role[0].toUpperCase() + session.role.slice(1)} {t("nav.dashboard").toLowerCase()}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`${homeRouteForRole(session.role)}/settings`}>
                    {t("nav.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden />
                  {signingOut ? t("nav.signingOut") : t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">{t("nav.signIn")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">{t("nav.getStarted")}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
