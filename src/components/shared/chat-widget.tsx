"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  MessageCircle,
  X,
  HelpCircle,
  Mail,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

/**
 * Help launcher — a floating button that opens a panel linking to real
 * support resources (help centre, contact form).
 *
 * Previously this was a fake chat widget that responded to user messages
 * with hardcoded auto-responses and never created a support ticket. That
 * was misleading — users believed they were chatting with a human agent.
 * This version is honest: it surfaces the real help and contact channels
 * without simulating a conversation.
 */
export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // Hide on auth pages (login, register, etc.) — the floating button is
  // distracting during authentication flows.
  const isAuthPage =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/reset-password") ||
    pathname?.startsWith("/auth/");

  if (isAuthPage) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help panel" : "Open help"}
        aria-expanded={open}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          open
            ? "bg-destructive text-destructive-foreground rotate-90"
            : "bg-primary text-primary-foreground hover:scale-105 hover:shadow-xl",
        )}
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden />
        )}
      </button>

      {/* Help panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Help and support"
          className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-border bg-primary/5 p-4">
            <Logo />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Need help?</p>
              <p className="text-xs text-muted-foreground">
                We&apos;re here for you.
              </p>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground text-pretty">
              Browse our help centre for answers to common questions, or send
              us a message and we&apos;ll respond by email.
            </p>

            <div className="space-y-2">
              <Link
                href="/help"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-muted"
              >
                <HelpCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Help centre</p>
                  <p className="text-xs text-muted-foreground">
                    FAQs, booking guides, payment help.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>

              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-muted"
              >
                <Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Contact us</p>
                  <p className="text-xs text-muted-foreground">
                    Send a message — we respond within one business day.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </div>

            <p className="pt-2 text-center text-xs text-muted-foreground">
              For urgent issues, use the contact form to open a support ticket.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
