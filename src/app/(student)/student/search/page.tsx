import * as React from "react";
import { Suspense } from "react";
import { SearchPageContent } from "@/components/public/search-page-content";

export const metadata = {
  title: "Find accommodation",
};

export default function StudentSearchPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted/40" />}>
      <SearchPageContent />
    </Suspense>
  );
}
