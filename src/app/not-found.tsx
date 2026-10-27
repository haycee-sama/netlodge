import Link from "next/link";
import { Home, Search, Building2, GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export const metadata = {
  title: "Page not found — NetLodge",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
      <Logo />
      <p className="mt-8 font-display text-7xl font-extrabold text-gradient-brand">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
        This page has moved out.
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground text-pretty">
        The page you're looking for doesn't exist or has been moved. Try searching for accommodation
        or browse our universities.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" aria-hidden />
            Back home
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/search">
            <Search className="mr-2 h-4 w-4" aria-hidden />
            Search accommodation
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/universities">
            <GraduationCap className="mr-2 h-4 w-4" aria-hidden />
            Browse universities
          </Link>
        </Button>
      </div>
      <Button asChild variant="ghost" size="sm" className="mt-6">
        <Link href="/contact">
          <ArrowLeft className="mr-2 h-3 w-3" aria-hidden />
          Still stuck? Contact us
        </Link>
      </Button>
    </div>
  );
}
