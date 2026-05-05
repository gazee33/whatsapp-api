"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, Server, Database, Clock, Cpu } from "lucide-react";
import { platformClient } from "@/lib/api-client";
import type { PlatformHealth } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SkeletonBlock } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatMemory(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full",
        ok ? "bg-emerald-500" : "bg-red-500"
      )}
    />
  );
}

export default function PlatformHealthPage() {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(() => {
    platformClient
      .get("/platform/health")
      .then((r) => {
        setHealth(r.data);
        setError(null);
      })
      .catch((err) => {
        setError(err?.message || "Failed to fetch health data");
      });
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (error && !health) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Activity className="h-12 w-12 text-red-500" />
        <p className="text-lg font-medium text-red-600">Health check failed</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!health)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonBlock className="h-7 w-40" />
            <SkeletonBlock className="mt-1 h-3 w-72" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-4 w-4" />
            <SkeletonBlock className="h-4 w-8" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border bg-card shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6 pb-3">
                <SkeletonBlock className="h-5 w-20" />
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 pb-6">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j}>
                    <SkeletonBlock className="h-3 w-16" />
                    <SkeletonBlock className="mt-1 h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6 pb-3">
            <SkeletonBlock className="h-5 w-40" />
          </div>
          <div className="grid grid-cols-2 gap-4 px-6 pb-6">
            <div>
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="mt-1 h-7 w-12" />
            </div>
            <div>
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="mt-1 h-7 w-12" />
            </div>
          </div>
        </div>
      </div>
    );

  const serverOk = health.server.status === "ok";
  const dbOk = health.database.status === "ok";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Health</h1>
          <p className="text-sm text-muted-foreground">
            Real-time system health and status. Auto-refreshes every 30s.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span className="animate-pulse">Live</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4 text-muted-foreground" />
              Server
              <StatusDot ok={serverOk} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <p className="font-medium capitalize">{health.server.status}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Node Version</span>
                <p className="font-medium">{health.server.nodeVersion}</p>
              </div>
              <div>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Uptime
                </span>
                <p className="font-medium">
                  {formatUptime(health.server.uptime)}
                </p>
              </div>
              <div>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Cpu className="h-3.5 w-3.5" />
                  Memory (RSS)
                </span>
                <p className="font-medium">
                  {formatMemory(health.server.memoryUsage.rss)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-muted-foreground" />
              Database
              <StatusDot ok={dbOk} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <span className="text-sm text-muted-foreground">Status</span>
              <p className="font-medium capitalize">{health.database.status}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">
                Total Businesses
              </span>
              <p className="text-2xl font-bold">
                {health.stats.totalBusinesses}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">
                Total Orders
              </span>
              <p className="text-2xl font-bold">
                {health.stats.totalOrders}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
