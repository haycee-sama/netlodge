import type { Metadata } from "next";
import { ContactPage } from "./contact-page";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Get in touch with the NetLodge team. We can help with bookings, landlord verification, support tickets, and partnership enquiries.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact us · NetLodge",
    description:
      "Get in touch with the NetLodge team. We can help with bookings, landlord verification, and partnership enquiries.",
    url: "/contact",
  },
};

export default function Page() {
  return <ContactPage />;
}
