"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { usePlatformStore } from "@/stores/platform-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";

export default function PlatformAuditLogsPage() {
  const auditLogs = usePlatformStore((s) => s.auditLogs);
  const pagination = usePlatformStore((s) => s.pagination);
  const isLoading = usePlatformStore((s) => s.isLoading);
  const fetchAuditLogs = usePlatformStore((s) => s.fetchAuditLogs);

  const [filters, setFilters] = useState({
    businessId: "",
    userId: "",
    action: "",
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params: Record<string, string | number> = { page, limit: 20 };
    if (filters.businessId) params.businessId = filters.businessId;
    if (filters.userId) params.userId = filters.userId;
    if (filters.action) params.action = filters.action;
    fetchAuditLogs(params);
  }, [fetchAuditLogs, page, filters]);

  const handleFilterChange = useCallback(
    (field: keyof typeof filters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
      setPage(1);
    },
    []
  );

  const logs = auditLogs?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          Track all platform activity and changes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="filter-business">Business ID</Label>
              <Input
                id="filter-business"
                value={filters.businessId}
                onChange={(e) => handleFilterChange("businessId", e.target.value)}
                placeholder="Filter by business ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-user">User ID</Label>
              <Input
                id="filter-user"
                value={filters.userId}
                onChange={(e) => handleFilterChange("userId", e.target.value)}
                placeholder="Filter by user ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-action">Action</Label>
              <Input
                id="filter-action"
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                placeholder="Filter by action"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {isLoading ? (
        <TableSkeleton columns={6} rows={8} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No audit logs found"
          description={
            Object.values(filters).some(Boolean)
              ? "No logs match your current filters."
              : "No audit logs have been recorded yet."
          }
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 sm:px-4 py-3 text-left font-medium text-muted-foreground">
                        Timestamp
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
                        Business
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                        User
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left font-medium text-muted-foreground">
                        Action
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                        Resource
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                        Resource ID
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                          {log.business?.name || log.businessId || "—"}
                        </td>
                        <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
                          {log.user?.email || log.userId || "—"}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-muted-foreground hidden lg:table-cell">
                          {log.resource || "—"}
                        </td>
                        <td className="px-3 sm:px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                          {log.resourceId
                            ? log.resourceId.length > 12
                              ? `${log.resourceId.slice(0, 12)}…`
                              : log.resourceId
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
