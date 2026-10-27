"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  X,
  Send,
  Headset,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/shared/logo";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: string;
}

const quickReplies = [
  "How do I book a room?",
  "How does verification work?",
  "How do I list my property?",
  "Payment & refund policy",
];

const autoResponses: Record<string, string> = {
  "how do i book a room":
    "Great question! To book a room: 1) Search for accommodation on our marketplace, 2) Click on any room to see its details, 3) Click 'Place hold & continue' to reserve it for 24 hours, 4) Complete payment via Paystack. Your booking is confirmed only after our backend verifies the payment.",
  "how does verification work":
    "Every landlord on NetLodge must complete a 4-step verification: identity (NIN/driver's licence), address (utility bill), ownership (certificate of occupancy), and an on-site inspection. The verified badge only appears after all steps pass — landlords cannot self-approve.",
  "how do i list my property":
    "To list a property: 1) Register as a landlord, 2) Complete verification, 3) Use the multi-step property wizard to describe your building, location, and facilities, 4) Add floors and rooms with individual prices, 5) Submit for verification. Once approved, your listing goes live.",
  "payment & refund policy":
    "All payments go through Paystack. Full refunds are available if you cancel within 24 hours of booking. Caution deposits are refunded at the end of your tenancy, less any documented damages. Refunds typically arrive in 5–7 business days.",
  "default":
    "Thanks for your message! Our support team will get back to you shortly. In the meantime, you can browse our help centre at /help or check our FAQ section. For urgent issues, please open a support ticket from your dashboard.",
};

function getAutoResponse(text: string): string {
  const lower = text.toLowerCase();
  for (const [key, response] of Object.entries(autoResponses)) {
    if (key !== "default" && lower.includes(key)) return response;
  }
  return autoResponses.default;
}

function generateId() {
  return `msg_${Math.random().toString(36).slice(2, 10)}`;
}

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      text: "Hi! I'm NetLodge Assistant. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Hide on auth pages
  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register") || pathname?.startsWith("/forgot-password") || pathname?.startsWith("/reset-password") || pathname?.startsWith("/auth/");

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  // Focus input when opened
  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Reset unread when opened
  React.useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  if (isAuthPage) return null;

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    // Simulate agent response
    setTimeout(() => {
      const agentMsg: ChatMessage = {
        id: generateId(),
        role: "agent",
        text: getAutoResponse(trimmed),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, agentMsg]);
      setTyping(false);
      if (!open) setUnread((u) => u + 1);
    }, 1200 + Math.random() * 800);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat support"}
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
          <div className="relative">
            <MessageCircle className="h-6 w-6" aria-hidden />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unread}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[min(32rem,calc(100vh-8rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15">
                <Headset className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold">NetLodge Assistant</p>
                <p className="flex items-center gap-1 text-xs text-primary-foreground/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                  Online now
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-lg p-1.5 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4"
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                {msg.role === "agent" && (
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-primary/10 p-0.5">
                      <Logo variant="mark" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm bg-card text-card-foreground border border-border",
                  )}
                >
                  <p className="text-pretty">{msg.text}</p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-primary/10 p-0.5">
                    <Logo variant="mark" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {/* Quick replies (show only at start) */}
            {messages.length <= 1 && !typing && (
              <div className="space-y-1.5 pt-2">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" aria-hidden /> Suggested questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickReplies.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border bg-card p-3">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="h-9 flex-1"
              aria-label="Chat message"
            />
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
