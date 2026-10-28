import * as React from "react";
import type { Metadata } from "next";
import { RoleShell } from "@/components/shared/role-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="manager">{children}</RoleShell>;
}
