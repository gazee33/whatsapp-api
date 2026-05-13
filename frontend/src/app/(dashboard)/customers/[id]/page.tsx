"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/language-context";
import {
  ArrowLeft,
  Phone,
  ShoppingBag,
  MessageSquare,
  Flag,
  AlertCircle,
  Clock,
  Star,
} from "lucide-react";
import { useCrmStore } from "@/stores/crm-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SkeletonBlock, ChatSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Switch } from "@/components/ui/switch";
import { cn, formatCurrency, formatDate, formatDateShort, formatTimeAgo } from "@/lib/utils";
import type { TimelineEntry } from "@/lib/types";

function OrderIcon() {
  return <ShoppingBag className="h-4 w-4" />;
}

function MessageIcon() {
  return <MessageSquare className="h-4 w-4" />;
}

function ComplaintIcon() {
  return <AlertCircle className="h-4 w-4" />;
}

function TimelineItem({ entry, t }: { entry: TimelineEntry; t: (key: string) => string }) {
  const isOrder = entry.type === "order";
  const isMessage = entry.type === "message";
  const isComplaint = entry.type === "complaint";

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            isOrder && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
            isMessage && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
            isComplaint && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          )}
        >
          {isOrder && <OrderIcon />}
          {isMessage && <MessageIcon />}
          {isComplaint && <ComplaintIcon />}
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDateShort(entry.date)}
        </div>
        {isOrder && (
          <div className="mt-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {t("crm.timeline_order")} {(entry.data as any).referenceId}
              </span>
              <StatusBadge status={(entry.data as any).status as string} />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatCurrency((entry.data as any).totalPrice as number)}
              {(entry.data as any).orderType && (
                <span className="ml-2 text-xs">· {(entry.data as any).orderType}</span>
              )}
            </p>
            {(entry.data as any).items && (
              <p className="text-xs text-muted-foreground">
                {((entry.data as any).items as Array<{ name: string; quantity: number }>)
                  .map((i: any) => `${i.quantity}x ${i.name}`)
                  .join(", ")}
              </p>
            )}
          </div>
        )}
        {isMessage && (
          <div className="mt-1">
            <p className="text-sm">
              <span className="font-medium">
                {(entry.data as any).role === "user" ? t("crm.timeline_customer") : t("crm.timeline_bot")}
              </span>
              : {(entry.data as any).content as string}
            </p>
          </div>
        )}
        {isComplaint && (
          <div className="mt-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t("crm.timeline_complaint")}</span>
              <StatusBadge status={(entry.data as any).status as string} type="complaint" />
            </div>
            <p className="text-sm text-muted-foreground">{(entry.data as any).content as string}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const {
    selectedCustomer,
    timeline,
    isLoadingDetail,
    isLoadingTimeline,
    fetchCustomer,
    fetchTimeline,
    toggleSupportFlag,
  } = useCrmStore();
  const [activeTab, setActiveTab] = useState("timeline");

  useEffect(() => {
    if (id) {
      fetchCustomer(id);
      fetchTimeline(id);
    }
  }, [id, fetchCustomer, fetchTimeline]);

  if (isLoadingDetail || !selectedCustomer) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-8 w-20" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SkeletonBlock className="h-7 w-48" />
            <SkeletonBlock className="mt-1 h-3.5 w-32" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <SkeletonBlock className="h-64 rounded-xl" />
      </div>
    );
  }

  const { customer, stats, recentOrders, complaints } = selectedCustomer;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {customer.name || customer.phone}
            </h1>
            {customer.flaggedForSupport && (
              <Flag className="h-5 w-5 text-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {customer.phone}
            </span>
            <span>{t("crm.member_since")} {formatDate(customer.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("crm.detail_total_orders")}</p>
              <p className="text-xl font-bold">{stats.totalOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("crm.detail_total_spent")}</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalSpent)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("crm.detail_avg_order")}</p>
              <p className="text-xl font-bold">{formatCurrency(stats.avgOrderValue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("crm.detail_messages")}</p>
              <p className="text-xl font-bold">{stats.totalMessages}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="timeline">{t("crm.tab_timeline")}</TabsTrigger>
          <TabsTrigger value="orders">{t("crm.tab_orders")} ({recentOrders.length})</TabsTrigger>
          <TabsTrigger value="complaints">
            {t("crm.tab_complaints")}
            {complaints.length > 0 && ` (${complaints.length})`}
          </TabsTrigger>
          <TabsTrigger value="info">{t("crm.tab_info")}</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {isLoadingTimeline && timeline.length === 0 ? (
                <ChatSkeleton />
              ) : timeline.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title={t("crm.no_activity")}
                  description={t("crm.no_activity_desc")}
                />
              ) : (
                <div className="space-y-0">
                  {timeline.map((entry) => (
                    <TimelineItem
                      key={`${entry.type}-${(entry.data as any).id || Math.random()}`}
                      entry={entry}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {recentOrders.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title={t("crm.no_orders_history")}
                  description={t("crm.no_orders_history_desc")}
                />
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-shadow hover:shadow-sm"
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{order.referenceId}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatCurrency(order.totalPrice)}</span>
                          {order.orderType && <span>· {order.orderType}</span>}
                          <span>· {formatTimeAgo(order.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complaints" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {complaints.length === 0 ? (
                <EmptyState
                  icon={AlertCircle}
                  title={t("crm.no_complaints")}
                  description={t("crm.no_complaints_desc")}
                />
              ) : (
                <div className="space-y-4">
                  {complaints.map((complaint) => (
                    <div key={complaint.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={complaint.status} type="complaint" />
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(complaint.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm">{complaint.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("crm.info_general")}
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t("crm.info_phone")}</dt>
                      <dd className="font-medium">{customer.phone}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t("crm.info_name")}</dt>
                      <dd className="font-medium">{customer.name || t("common.na")}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t("crm.info_member_since")}</dt>
                      <dd className="font-medium">{formatDate(customer.createdAt)}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-muted-foreground">{t("crm.info_flagged")}</dt>
                      <dd className="flex items-center gap-2">
                        <Switch
                          checked={customer.flaggedForSupport}
                          onCheckedChange={() => toggleSupportFlag(customer.id)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {customer.flaggedForSupport ? t("common.yes") : t("common.no")}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("crm.info_favorites")}
                  </h3>
                  {stats.favoriteItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("crm.no_favorites")}</p>
                  ) : (
                    <dl className="space-y-2 text-sm">
                      {stats.favoriteItems.map((item, i) => (
                        <div key={i} className="flex justify-between">
                          <dt className="text-muted-foreground">{item.name}</dt>
                          <dd className="font-medium">
                            {item.count}x
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("crm.info_order_types")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.orderTypeBreakdown).length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("crm.no_order_types")}</p>
                  ) : (
                    Object.entries(stats.orderTypeBreakdown).map(([type, count]) => (
                      <span
                        key={type}
                        className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
                      >
                        {type}: {count}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
