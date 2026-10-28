"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-components";
import { contactSchema, type ContactInput } from "@/lib/validators";
import { toast } from "sonner";

export function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { category: "general" },
  });

  const category = watch("category");

  async function onSubmit(values: ContactInput) {
    // Store the contact message in the database via the support_tickets table.
    // This creates a real ticket that support staff can see in their dashboard.
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Authenticated user — create a support ticket
        const { error } = await supabase.rpc("create_student_ticket", {
          p_subject: values.subject,
          p_category: values.category,
          p_message: `${values.message}\n\n— From: ${values.name} (${values.email})`,
          p_priority: "medium",
        });
        if (error) throw error;
      } else {
        // Anonymous user — we can't create a ticket without auth.
        // In production, this should use a server action or edge function
        // to send an email. For now, store the attempt honestly.
        throw new Error("Please sign in to submit a support ticket, or email us directly at hello@netlodge.com");
      }

      setSubmitted(true);
      toast.success("Message sent", {
        description: "Our team will respond within one business day.",
      });
      reset();
    } catch (e) {
      toast.error("Could not send message", {
        description: e instanceof Error ? e.message : "Please try again or email hello@netlodge.com",
      });
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Contact us"
        title="Get in touch"
        description="Questions, partnership enquiries, safety reports — we read every message. Expect a response within one business day."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Form */}
        <Card>
          <CardContent className="p-6 sm:p-8">
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="h-6 w-6" aria-hidden />
                </div>
                <p className="font-display text-lg font-semibold">Message sent</p>
                <p className="max-w-md text-sm text-muted-foreground text-pretty">
                  Thanks for reaching out. We'll reply to your email within one business day.
                </p>
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" autoComplete="name" {...register("name")} />
                    {errors.name && (
                      <p role="alert" className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" {...register("email")} />
                    {errors.email && (
                      <p role="alert" className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={category}
                      onValueChange={(v) => setValue("category", v as ContactInput["category"])}
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General enquiry</SelectItem>
                        <SelectItem value="press">Press</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                        <SelectItem value="safety">Safety report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" {...register("subject")} />
                    {errors.subject && (
                      <p role="alert" className="text-xs text-destructive">{errors.subject.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={6}
                    placeholder="Tell us how we can help…"
                    {...register("message")}
                  />
                  {errors.message && (
                    <p role="alert" className="text-xs text-destructive">{errors.message.message}</p>
                  )}
                </div>

                <Button type="submit" disabled={isSubmitting} size="lg">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" aria-hidden />
                      Send message
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-5 text-sm">
              <p className="font-display font-semibold">Other ways to reach us</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" aria-hidden />
                  <a href="mailto:hello@netlodge.example" className="hover:text-foreground hover:underline">
                    hello@netlodge.example
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" aria-hidden />
                  <span>+234 800 NETLODGE</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                  <span>2A Herbert Macaulay Way, Yaba, Lagos, Nigeria</span>
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 p-5 text-sm">
              <p className="font-display font-semibold">Response times</p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>· General enquiries: 1 business day</li>
                <li>· Support tickets: 4 hours</li>
                <li>· Safety reports: 2 hours</li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
