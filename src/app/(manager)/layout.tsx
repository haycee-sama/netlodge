import * as React from "react";
import { RoleShell } from "@/components/shared/role-shell";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="manager">{children}</RoleShell>;
}
