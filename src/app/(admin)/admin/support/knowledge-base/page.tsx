"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { getRepositories } from "@/lib/repositories";
import type { KnowledgeBaseArticle } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { EmptyState } from "@/components/shared/page-components";
import { BookOpen, Search, Plus } from "lucide-react";

export default function SupportKnowledgeBasePage() {
  const [articles, setArticles] = React.useState<KnowledgeBaseArticle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    getRepositories().knowledgeBase.list().then((a) => {
      setArticles(a); setLoading(false);
    });
  }, []);

  const filtered = q
    ? articles.filter((a) => `${a.title} ${a.excerpt} ${a.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()))
    : articles;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="Support operations"
        title="Knowledge base"
        description="Reusable articles and canned responses for common customer questions."
        breadcrumbs={[{ label: "Support", href: "/admin/support" }, { label: "Knowledge base" }]}
        actions={<Button><Plus className="mr-2 h-4 w-4" aria-hidden /> New article</Button>}
      />
      <DemoModeBanner />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" placeholder="Search articles…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-5 w-5" aria-hidden />} title="No articles found" description="Try a different search, or create a new article." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{a.title}</p>
                  <Badge variant="outline" className="text-xs">{a.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground text-pretty">{a.excerpt}</p>
                <div className="flex flex-wrap gap-1">
                  {a.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                </div>
                <p className="text-xs text-muted-foreground">{a.views} views · updated {formatRelativeTime(a.updatedAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
