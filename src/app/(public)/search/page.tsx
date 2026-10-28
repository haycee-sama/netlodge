import * as React from "react";
import { Suspense } from "react";
import { SearchPageContent } from "@/components/public/search-page-content";

export const metadata = {
  title: "Search accommodation",
  alternates: { canonical: "/search" },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="h-64 animate-pulse rounded-md bg-muted/40" /></div>}>
      <SearchPageContent />
    </Suspense>
  );
}
