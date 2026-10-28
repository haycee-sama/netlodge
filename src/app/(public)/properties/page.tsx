import type { Metadata } from "next";
import { PropertiesPage } from "./properties-page";

export const metadata: Metadata = {
  title: "Browse verified properties",
  description:
    "Browse all verified student accommodation properties on NetLodge. Filter by university, search by area, and inspect individual rooms before booking.",
  alternates: { canonical: "/properties" },
  openGraph: {
    title: "Browse verified properties · NetLodge",
    description:
      "Browse all verified student accommodation properties on NetLodge. Filter by university and inspect individual rooms.",
    url: "/properties",
  },
};

export default function Page() {
  return <PropertiesPage />;
}
