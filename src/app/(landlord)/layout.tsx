import * as React from "react";
import type { Metadata } from "next";
import { RoleShell } from "@/components/shared/role-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="landlord">{children}</RoleShell>;
}
