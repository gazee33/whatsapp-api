"use client";

import { cn } from "@/lib/utils";

// ── Primitives ──

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} />
  );
}

// ── CardSkeleton ──

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 3 }: CardSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-2/3" />
              <SkeletonBlock className="h-4 w-12" />
            </div>
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── TableSkeleton ──

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableSkeleton({ columns = 5, rows = 8 }: TableSkeletonProps) {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* header */}
      <div className="flex gap-4 border-b bg-muted/50 px-4 py-3">
        {Array.from({ length: columns }).map((_, c) => (
          <SkeletonBlock
            key={c}
            className={cn(
              "h-3",
              c === 0 ? "w-24" : c === columns - 1 ? "ml-auto w-12" : "flex-1"
            )}
          />
        ))}
      </div>
      {/* rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3">
            {Array.from({ length: columns }).map((_, c) => (
              <SkeletonBlock
                key={c}
                className={cn(
                  "h-4",
                  c === 0
                    ? "w-28"
                    : c === columns - 1
                      ? "ml-auto w-10"
                      : "flex-1",
                  r % 2 === 0 ? "opacity-80" : "opacity-50"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FormSkeleton ──

interface FormSkeletonProps {
  sections?: number;
  fieldsPerSection?: number;
}

export function FormSkeleton({
  sections = 2,
  fieldsPerSection = 3,
}: FormSkeletonProps) {
  return (
    <div className="space-y-6">
      {Array.from({ length: sections }).map((_, s) => (
        <div key={s} className="rounded-xl border bg-card shadow-sm">
          <div className="space-y-1.5 p-6 pb-4">
            <SkeletonBlock className="h-5 w-48" />
            <SkeletonBlock className="h-3 w-72" />
          </div>
          <div className="space-y-4 px-6 pb-6">
            {Array.from({ length: fieldsPerSection }).map((_, f) => (
              <div key={f} className="space-y-2">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── StatsSkeleton ──

interface StatsSkeletonProps {
  count?: number;
}

export function StatsSkeleton({ count = 4 }: StatsSkeletonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-10 w-10 rounded-lg" />
            <SkeletonBlock className="h-4 w-4" />
          </div>
          <div className="mt-3 space-y-1.5">
            <SkeletonBlock className="h-7 w-16" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── DetailSkeleton ──

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-8 w-8" />
        <div>
          <SkeletonBlock className="h-7 w-56" />
          <SkeletonBlock className="mt-1 h-3 w-40" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6 pb-3">
                <SkeletonBlock className="h-5 w-32" />
              </div>
              <div className="px-6 pb-6 space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <SkeletonBlock className="h-4 w-1/3" />
                    <SkeletonBlock className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Sidebar */}
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border bg-card shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6 pb-3">
                <SkeletonBlock className="h-5 w-24" />
              </div>
              <div className="px-6 pb-6 space-y-3">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-3/4" />
                <SkeletonBlock className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Compounded helpers ──

/** Page header skeleton (title + subtitle) */
export function PageHeaderSkeleton({
  hasAction,
}: {
  hasAction?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <SkeletonBlock className="h-7 w-48" />
        <SkeletonBlock className="mt-1 h-3 w-72" />
      </div>
      {hasAction && <SkeletonBlock className="h-9 w-28" />}
    </div>
  );
}

/** Tabs skeleton */
export function TabsSkeleton({
  tabCount = 7,
}: {
  tabCount?: number;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto">
      {Array.from({ length: tabCount }).map((_, i) => (
        <SkeletonBlock key={i} className="h-9 w-20 rounded-md" />
      ))}
    </div>
  );
}

/** Chat bubble skeleton */
export function ChatSkeleton({
  messageCount = 6,
}: {
  messageCount?: number;
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: messageCount }).map((_, i) => {
        const isRight = i % 2 === 1;
        return (
          <div
            key={i}
            className={cn("flex", isRight ? "justify-end" : "justify-start")}
          >
            <SkeletonBlock
              className={cn(
                "h-16 rounded-2xl",
                isRight ? "w-2/3" : "w-1/2"
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Grid of card skeletons */
export function CardGridSkeleton({
  count = 6,
  columns = 3,
}: {
  count?: number;
  columns?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
          <SkeletonBlock className="h-5 w-2/3" />
          <SkeletonBlock className="mt-3 h-3 w-full" />
          <SkeletonBlock className="mt-2 h-3 w-1/2" />
          <div className="mt-4 flex justify-between">
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Page-level separator skeleton */
export function SeparatorSkeleton() {
  return <SkeletonBlock className="h-px w-full" />;
}
