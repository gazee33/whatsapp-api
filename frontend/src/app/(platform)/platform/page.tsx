"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { usePlatformStore } from "@/stores/platform-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsSkeleton, SkeletonBlock } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, ORDER_STATUS_CONFIG } from "@/lib/utils";

const STATUS_BAR_COLORS: Record<string, string> = {
  pending: "bg-yellow-400",
  confirmed: "bg-blue-400",
  preparing: "bg-purple-400",
  ready: "bg-green-400",
  delivered: "bg-emerald-400",
  cancelled: "bg-red-400",
};

export default function PlatformDashboardPage() {
  const analytics = usePlatformStore((s) => s.analytics);
  const isLoading = usePlatformStore((s) => s.isLoading);
  const fetchAnalytics = usePlatformStore((s) => s.fetchAnalytics);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const statusTotal = useMemo(() => {
    if (!analytics?.orderStatusBreakdown) return 0;
    return Object.values(analytics.orderStatusBreakdown).reduce(
      (a, b) => a + b,
      0
    );
  }, [analytics]);

  if (isLoading)
    return (
      <div className="space-y-6">
        <div>
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="mt-1 h-3 w-72" />
        </div>
        <StatsSkeleton />
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border bg-card shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6 pb-3">
                <SkeletonBlock className="h-5 w-40" />
              </div>
              <div className="px-6 pb-6 space-y-3">
                {i === 1 ? (
                  <>
                    <SkeletonBlock className="h-4 w-full rounded-full" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <SkeletonBlock className="h-3 w-3 rounded-full" />
                          <SkeletonBlock className="h-3 w-12" />
                          <SkeletonBlock className="ms-auto h-3 w-4" />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  Array.from({ length: 5 }).map((_, j) => (
                    <div
                      key={j}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <SkeletonBlock className="h-6 w-6 rounded-full" />
                        <SkeletonBlock className="h-4 w-32" />
                      </div>
                      <SkeletonBlock className="h-4 w-16" />
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  if (!analytics) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No analytics data"
        description="Analytics data is not available yet."
      />
    );
  }

  const { summary, orderStatusBreakdown, topBusinesses } = analytics;

  const statCards = [
    {
      label: "Total Businesses",
      value: summary.totalBusinesses,
      icon: Building2,
      color: "text-blue-600",
    },
    {
      label: "Total Orders",
      value: summary.totalOrders,
      icon: ShoppingBag,
      color: "text-purple-600",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(summary.totalRevenue),
      icon: DollarSign,
      color: "text-emerald-600",
    },
    {
      label: "Orders (30 days)",
      value: summary.ordersLast30Days,
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of all businesses and platform metrics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </span>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="mt-2 text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Order Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusTotal > 0 ? (
              <>
                <div className="flex h-4 w-full overflow-hidden rounded-full">
                  {Object.entries(orderStatusBreakdown).map(([status, count]) => (
                    <div
                      key={status}
                      className={STATUS_BAR_COLORS[status] || "bg-gray-300"}
                      style={{
                        width: `${(count / statusTotal) * 100}%`,
                      }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(orderStatusBreakdown).map(([status, count]) => {
                    const config = ORDER_STATUS_CONFIG[status];
                    if (!config || count === 0) return null;
                    return (
                      <div
                        key={status}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className={`h-3 w-3 rounded-full ${STATUS_BAR_COLORS[status] || "bg-gray-300"}`}
                        />
                        <span className="text-muted-foreground">
                          {config.label}
                        </span>
                        <span className="ms-auto font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No orders yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Top Businesses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topBusinesses.length > 0 ? (
              <div className="space-y-3">
                {topBusinesses.slice(0, 5).map((b, i) => (
                  <Link
                    key={b.id}
                    href={`/platform/businesses/${b.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium">{b.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {b.orderCount} orders
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No businesses yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
