"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/language-context";
import { EmptyState } from "@/components/shared/empty-state";
import { FileText } from "lucide-react";

interface Column<T = Record<string, unknown>> {
  key: string;
  header: string;
  render?: (value: unknown, row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  renderActions?: (row: T) => ReactNode;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyTitle,
  emptyDescription,
  renderActions,
}: DataTableProps<T>) {
  const { t } = useLanguage();
  const colCount = columns.length + (renderActions ? 1 : 0);
  const resolvedEmptyTitle = emptyTitle ?? t("common.no_data");

  return (
    <>
      {/* Desktop: Table */}
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
                {renderActions && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("common.actions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} cols={colCount} />
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="p-0">
                    <EmptyState
                      icon={FileText}
                      title={resolvedEmptyTitle}
                      description={emptyDescription}
                      className="py-12"
                    />
                  </td>
                </tr>
              ) : (
                data.map((row, rowIdx) => (
                  <tr
                    key={(row.id as string) ?? rowIdx}
                    className="transition-colors hover:bg-muted/30"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 text-sm",
                          col.className
                        )}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : (row[col.key] as ReactNode) ?? t("common.dash")}
                      </td>
                    ))}
                    {renderActions && (
                      <td className="px-4 py-3 text-right text-sm">
                        {renderActions(row)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: Stacked Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border p-4 space-y-3"
            >
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-4 w-full rounded bg-muted" />
              ))}
            </div>
          ))
        ) : data.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={resolvedEmptyTitle}
            description={emptyDescription}
          />
        ) : (
          data.map((row, rowIdx) => (
            <div
              key={(row.id as string) ?? rowIdx}
              className="rounded-xl border p-4 space-y-2"
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">
                    {col.header}
                  </span>
                  <span className={cn("text-sm text-right", col.className)}>
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] as ReactNode) ?? t("common.dash")}
                  </span>
                </div>
              ))}
              {renderActions && (
                <div className="flex justify-end pt-2 border-t">
                  {renderActions(row)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
