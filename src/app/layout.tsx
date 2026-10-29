import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { AuthProvider } from "@/lib/auth/auth-context";
import { QueryProvider } from "@/components/shared/query-provider";
import { ChatWidget } from "@/components/shared/chat-widget";
import { GoogleAnalytics } from "@/components/shared/google-analytics";
import { I18nProvider } from "@/lib/i18n/context";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://netlodge.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NetLodge — Verified student accommodation in Nigeria",
    template: "%s · NetLodge",
  },
  description:
    "Discover, compare and book verified student accommodation around Nigerian universities. Browse individual rooms, inspect facilities, and reserve with confidence on NetLodge.",
  keywords: [
    "student accommodation Nigeria",
    "UNILAG housing",
    "Akoka hostels",
    "Yaba student rooms",
    "Nigerian university accommodation",
    "verified student housing",
    "NetLodge",
  ],
  authors: [{ name: "NetLodge" }],
  creator: "NetLodge",
  applicationName: "NetLodge",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: SITE_URL,
    siteName: "NetLodge",
    title: "NetLodge — Verified student accommodation in Nigeria",
    description:
      "Discover, compare and book verified student accommodation around Nigerian universities.",
    images: [
      {
        url: "/netlodge-mark.svg",
        width: 1200,
        height: 630,
        alt: "NetLodge — Student Accommodation, Simplified.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NetLodge — Verified student accommodation in Nigeria",
    description:
      "Discover, compare and book verified student accommodation around Nigerian universities.",
    images: ["/netlodge-mark.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f766e" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1f1c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-flash theme script: resolves the persisted theme (including "system") and applies it before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('netlodge-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||((t==='system'||!t)&&m);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${sans.variable} ${display.variable} ${mono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="netlodge-theme"
        >
          <QueryProvider>
            <I18nProvider>
              <AuthProvider>
              <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
              <ChatWidget />
              <Toaster />
              <Sonner position="top-right" richColors closeButton />
              <GoogleAnalytics />
              </AuthProvider>
            </I18nProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
