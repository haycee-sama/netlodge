import * as React from "react";
import { RoleShell } from "@/components/shared/role-shell";

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="landlord">{children}</RoleShell>;
}
