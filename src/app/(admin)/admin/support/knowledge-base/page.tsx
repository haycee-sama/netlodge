"use client";

import * as React from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";

export default function AdminSupportKnowledgeBasePage() {
  const { session } = useAuth();
  const isSupabaseAuth = session?.authenticated === true;

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Knowledge base" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Support operations" title="Knowledge base" description="Help articles and guides for support staff." breadcrumbs={[{ label: "Support Agent", href: "/admin/support" }, { label: "Knowledge base" }]} />
      <Card><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Knowledge base management is not yet available</p>
        <p className="text-xs text-muted-foreground max-w-md">The knowledge base requires a dedicated articles schema with CRUD operations, role-based editing permissions, and version control. This will be implemented in a future phase. For now, support staff should use the help page at <a href="/help" className="text-primary hover:underline">/help</a> for reference.</p>
      </CardContent></Card>
    </div>
  );
}
