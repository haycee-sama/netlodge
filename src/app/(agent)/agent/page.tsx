"use client";

import * as React from "react";
import Link from "next/link";
import { Briefcase, Building2, MessageSquare, Share2, ArrowRight, AlertCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState, SectionHeading } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { properties as allProperties } from "@/lib/data/fixtures";
import type { Property } from "@/lib/types";

interface Enquiry { id: string; studentName: string; propertyId: string; message: string; createdAt: string; status: "new" | "responded" | "closed"; }
interface Referral { id: string; code: string; clicks: number; signups: number; conversions: number; earningsKobo: number; }

const demoEnquiries: Enquiry[] = [
  { id: "enq_1", studentName: "Tunde Bello", propertyId: "prop_akoka_heights", message: "Is G-101 still available for September?", createdAt: new Date(Date.now() - 3600000).toISOString(), status: "new" },
  { id: "enq_2", studentName: "Aisha Mohammed", propertyId: "prop_yaba_suites", message: "Can I view Apartment A-1 this weekend?", createdAt: new Date(Date.now() - 86400000).toISOString(), status: "responded" },
];

const demoReferral: Referral = { id: "ref_1", code: "ADA-EZ-2024", clicks: 142, signups: 23, conversions: 5, earningsKobo: 2500000 };

export default function AgentDashboardPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [enquiries, setEnquiries] = React.useState<Enquiry[]>(demoEnquiries);

  React.useEffect(() => {
    if (!session) return;
    getRepositories().properties.listByAgent(session.userId || "dev_agent_1").then(setProperties);
  }, [session]);

  const newEnquiries = enquiries.filter((e) => e.status === "new");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow={`Welcome${session ? `, ${session.firstName}` : ""}`} title="Agent dashboard" description="Manage your assignments, student enquiries and referrals." />

      <Card className="border-info/30 bg-info/5">
        <CardContent className="flex items-start gap-2 p-3 text-xs text-info">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>As an agent, you can manage enquiries and referrals for your assigned properties. You do not have access to pricing controls, payments, ownership information, or verification.</span>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned properties" value={properties.length} icon={<Briefcase className="h-4 w-4" aria-hidden />} />
        <StatCard label="Open enquiries" value={newEnquiries.length} hint={`${enquiries.length} total`} icon={<MessageSquare className="h-4 w-4" aria-hidden />} />
        <StatCard label="Referral clicks" value={demoReferral.clicks} hint={`${demoReferral.signups} signups`} icon={<Share2 className="h-4 w-4" aria-hidden />} />
        <StatCard label="Referral earnings" value={`₦${(demoReferral.earningsKobo / 100).toLocaleString()}`} hint={`${demoReferral.conversions} conversions`} icon={<TrendingUp className="h-4 w-4" aria-hidden />} />
      </div>

      <section>
        <SectionHeading eyebrow="Pending" title="Open enquiries" action={<Button asChild variant="ghost" size="sm"><Link href="/agent/enquiries">All</Link></Button>} />
        {enquiries.length === 0 ? (
          <EmptyState className="mt-4" icon={<MessageSquare className="h-5 w-5" aria-hidden />} title="No enquiries" />
        ) : (
          <Card className="mt-4">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {enquiries.slice(0, 4).map((e) => {
                  const property = allProperties.find((p) => p.id === e.propertyId);
                  return (
                    <li key={e.id}>
                      <Link href="/agent/enquiries" className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{e.studentName}</p>
                            <Badge variant="outline" className="capitalize text-xs">{e.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{property?.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{e.message}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/agent/assignments", icon: Briefcase, label: "View assignments" },
          { href: "/agent/enquiries", icon: MessageSquare, label: "Respond to enquiries" },
          { href: "/agent/referrals", icon: Share2, label: "Share referral code" },
          { href: "/agent/properties", icon: Building2, label: "Browse properties" },
        ].map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><q.icon className="h-4 w-4" aria-hidden /></div>
                <p className="flex-1 text-sm font-medium">{q.label}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
