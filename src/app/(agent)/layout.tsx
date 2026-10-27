import * as React from "react";
import { RoleShell } from "@/components/shared/role-shell";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="agent">{children}</RoleShell>;
}
