"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, Loader2, ArrowLeft, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime, initials } from "@/lib/utils/format";
import { toast } from "sonner";

interface Conversation {
  id: string;
  student_id: string;
  landlord_id: string;
  property_id: string | null;
  last_message_at: string;
  status: string;
  other_name: string;
  other_id: string;
  property_name: string | null;
  last_message: string | null;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface MessagingProps {
  /** "student" or "landlord" — determines which side of the conversation the user is on */
  role: "student" | "landlord";
}

export function MessagingPage({ role }: MessagingProps) {
  const router = useRouter();
  const { session } = useAuth();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loadingList, setLoadingList] = React.useState(true);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const isSupabaseAuth = session?.authenticated === true;

  // Load conversations
  const loadConversations = React.useCallback(async () => {
    if (!isSupabaseAuth || !session?.userId) { setLoadingList(false); return; }
    const supabase = createClient();
    const myField = role === "student" ? "student_id" : "landlord_id";
    const otherField = role === "student" ? "landlord_id" : "student_id";

    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id, student_id, landlord_id, property_id, last_message_at, status,
        student:profiles!conversations_student_id_fkey(first_name, last_name),
        landlord:profiles!conversations_landlord_id_fkey(first_name, last_name),
        properties(name)
      `)
      .eq(myField, session.userId)
      .order("last_message_at", { ascending: false });

    if (error) {
      toast.error("Could not load conversations", { description: error.message });
      setLoadingList(false);
      return;
    }

    // Fetch last message + unread count for each conversation
    const enriched = await Promise.all(
      (data ?? []).map(async (c: any) => {
        const other = role === "student" ? c.landlord : c.student;
        const otherName = other ? `${other.first_name} ${other.last_name}`.trim() : "Unknown";
        const otherId = role === "student" ? c.landlord_id : c.student_id;

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("body")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: unread } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .neq("sender_id", session.userId)
          .is("read_at", null);

        return {
          id: c.id,
          student_id: c.student_id,
          landlord_id: c.landlord_id,
          property_id: c.property_id,
          last_message_at: c.last_message_at,
          status: c.status,
          other_name: otherName,
          other_id: otherId,
          property_name: c.properties?.name ?? null,
          last_message: lastMsg?.body ?? null,
          unread_count: unread ?? 0,
        } as Conversation;
      })
    );

    setConversations(enriched);
    setLoadingList(false);
  }, [isSupabaseAuth, session?.userId, role]);

  React.useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages when a conversation is selected + subscribe to realtime
  React.useEffect(() => {
    if (!selectedId || !session?.userId) return;
    setLoadingMessages(true);
    const supabase = createClient();

    // Fetch messages
    supabase
      .from("messages")
      .select("id, sender_id, body, read_at, created_at")
      .eq("conversation_id", selectedId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data, error }) => {
        if (error) {
          toast.error("Could not load messages", { description: error.message });
        } else {
          setMessages((data ?? []) as Message[]);
        }
        setLoadingMessages(false);
      });

    // Mark messages from the other person as read
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", selectedId)
      .neq("sender_id", session.userId)
      .is("read_at", null)
      .then(() => {
        // Update unread count in the conversation list
        setConversations((prev) =>
          prev.map((c) => c.id === selectedId ? { ...c, unread_count: 0 } : c)
        );
      });

    // Realtime subscription for new messages
    const channel = supabase
      .channel(`messages:${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          // If the message is from the other person, mark it as read
          if (newMsg.sender_id !== session.userId) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", newMsg.id)
              .is("read_at", null)
              .then();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId, session?.userId]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!draft.trim() || !selectedId || !session?.userId) return;
    const body = draft.trim();
    setDraft("");
    setSending(true);

    const supabase = createClient();
    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      sender_id: session.userId,
      body,
    });

    if (error) {
      toast.error("Could not send message", { description: error.message });
      setDraft(body); // restore the draft
    } else {
      // Update last_message_at on the conversation
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedId);
      // Refresh conversation list to update last message preview
      loadConversations();
    }
    setSending(false);
  }

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="Messages" title="In-app messaging" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in to view your messages.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        eyebrow="Messages"
        title="In-app messaging"
        description={role === "student"
          ? "Chat with landlords about rooms, bookings, and maintenance."
          : "Respond to student enquiries about your properties."}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr] h-[600px]">
        {/* Conversation list */}
        <Card className="flex flex-col overflow-hidden">
          <div className="border-b border-border p-3">
            <p className="text-sm font-semibold">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No conversations yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/40 ${
                        selectedId === c.id ? "bg-primary/5" : ""
                      }`}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {initials(c.other_name.split(" ")[0], c.other_name.split(" ")[1])}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{c.other_name}</p>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatRelativeTime(c.last_message_at)}
                          </span>
                        </div>
                        {c.property_name && (
                          <p className="truncate text-xs text-muted-foreground">{c.property_name}</p>
                        )}
                        <p className="truncate text-xs text-muted-foreground">
                          {c.last_message ?? "No messages yet"}
                        </p>
                      </div>
                      {c.unread_count > 0 && (
                        <Badge className="shrink-0 bg-primary text-primary-foreground text-xs">
                          {c.unread_count}
                        </Badge>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Message view */}
        <Card className="flex flex-col overflow-hidden">
          {selectedId ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {conversations.find((c) => c.id === selectedId)?.other_name ?? "Chat"}
                  </p>
                  {conversations.find((c) => c.id === selectedId)?.property_name && (
                    <p className="truncate text-xs text-muted-foreground">
                      {conversations.find((c) => c.id === selectedId)?.property_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No messages yet. Start the conversation.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === session?.userId;
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                            isMe
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={`mt-1 text-xs ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {formatRelativeTime(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message…"
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ maxHeight: "120px" }}
                  />
                  <Button size="icon" onClick={sendMessage} disabled={sending || !draft.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icon={<MessageSquare className="h-5 w-5" aria-hidden />}
                title="Select a conversation"
                description="Choose a conversation from the list to start chatting."
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
