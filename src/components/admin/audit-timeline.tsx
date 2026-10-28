import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditSeverityBadge } from "@/components/shared/status-badges";
import { initials } from "@/lib/utils/format";
import type { AuditLog } from "@/lib/types";
import { formatRelativeTime, formatDateTime } from "@/lib/utils/format";

interface AuditTimelineProps {
  logs: AuditLog[];
  title?: string;
  className?: string;
  emptyMessage?: string;
}

/**
 * Renders an audit log as a vertical timeline. Used on detail pages to show
 * the history of actions taken on a resource.
 */
export function AuditTimeline({
  logs,
  title = "Activity timeline",
  className,
  emptyMessage = "No activity recorded yet.",
}: AuditTimelineProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {logs.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ol className="relative space-y-0">
            {logs.map((log, i) => (
              <li
                key={log.id}
                className={cn(
                  "flex gap-3 px-6 py-3",
                  i !== logs.length - 1 && "border-b border-border",
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                    {initials(
                      log.actorEmail.split("@")[0].split(/[._]/)[0],
                      log.actorEmail.split("@")[0].split(/[._]/)[1] ?? "",
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{log.summary}</p>
                    <AuditSeverityBadge severity={log.severity} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">{log.actorEmail}</span> · {log.action} ·{" "}
                    <span title={formatDateTime(log.timestamp)}>{formatRelativeTime(log.timestamp)}</span>
                  </p>
                  {log.ipAddress && (
                    <p className="text-xs text-muted-foreground/70">IP: {log.ipAddress}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact single-line audit entry, for use in tight spaces.
 */
export function AuditEntry({ log }: { log: AuditLog }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border p-2 text-xs">
      <AuditSeverityBadge severity={log.severity} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{log.summary}</p>
        <p className="text-muted-foreground">
          {log.actorEmail} · {formatRelativeTime(log.timestamp)}
        </p>
      </div>
    </div>
  );
}
