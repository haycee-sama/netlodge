"use client";

import * as React from "react";
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/page-components";

export interface Column<T> {
  /** Unique key for the column. */
  key: string;
  /** Column header label. */
  header: string;
  /** Render the cell content. Defaults to `(row as any)[key]`. */
  cell?: (row: T) => React.ReactNode;
  /** Whether the column is sortable. If true, `sortKey` must be set or `key` is used. */
  sortable?: boolean;
  /** Sort key to pass to the backend. Defaults to `key`. */
  sortKey?: string;
  /** Optional className for the cell. */
  className?: string;
  /** Optional className for the header. */
  headerClassName?: string;
}

export interface AdminDataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  total: number;
  loading?: boolean;
  // Search
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  // Filters (rendered as children or via filterSlot)
  filters?: React.ReactNode;
  // Sorting
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (sortBy: string, sortDir: "asc" | "desc") => void;
  // Pagination
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  // Row click
  onRowClick?: (row: T) => void;
  getRowId: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  className?: string;
}

export function AdminDataTable<T>({
  columns,
  rows,
  total,
  loading,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  sortBy,
  sortDir,
  onSort,
  page,
  pageSize,
  onPageChange,
  onRowClick,
  getRowId,
  emptyTitle = "No results",
  emptyDescription = "Try adjusting your filters or search query.",
  emptyAction,
  className,
}: AdminDataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function handleSort(col: Column<T>) {
    if (!col.sortable || !onSort) return;
    const sKey = col.sortKey ?? col.key;
    if (sortBy === sKey && sortDir === "asc") {
      onSort(sKey, "desc");
    } else if (sortBy === sKey && sortDir === "desc") {
      onSort(sKey, "asc");
    } else {
      onSort(sKey, "asc");
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search + filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            className="h-9 pl-9"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                        col.sortable && "cursor-pointer select-none hover:text-foreground",
                        col.headerClassName,
                      )}
                      onClick={() => handleSort(col)}
                      aria-sort={
                        sortBy === (col.sortKey ?? col.key)
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {col.sortable && (
                          <span className="text-muted-foreground/60">
                            {sortBy === (col.sortKey ?? col.key) ? (
                              sortDir === "asc" ? (
                                <ChevronUp className="h-3 w-3" aria-hidden />
                              ) : (
                                <ChevronDown className="h-3 w-3" aria-hidden />
                              )
                            ) : (
                              <ChevronsUpDown className="h-3 w-3" aria-hidden />
                            )}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3">
                          <Skeleton className="h-4 w-full max-w-[120px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-2">
                      <EmptyState
                        title={emptyTitle}
                        description={emptyDescription}
                        action={emptyAction}
                        className="border-0"
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={getRowId(row)}
                      className={cn(
                        "border-b border-border last:border-0 transition-colors",
                        onRowClick && "cursor-pointer hover:bg-muted/40",
                      )}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={cn("px-4 py-3 align-middle", col.className)}>
                          {col.cell ? col.cell(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Loading…
            </span>
          ) : (
            <span>
              Showing <strong className="text-foreground">{start}</strong>–<strong className="text-foreground">{end}</strong> of{" "}
              <strong className="text-foreground">{total}</strong>
            </span>
          )}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <span className="px-2 text-xs text-muted-foreground">
            Page <strong className="text-foreground">{page}</strong> of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
