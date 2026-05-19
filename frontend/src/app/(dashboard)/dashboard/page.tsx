"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/i18n/language-context";
import {
  ShoppingBag,
  DollarSign,
  Clock,
  MessageSquare,
  ArrowUpRight,
  PackageOpen,
  MessageCircle,
  Radio,
  X,
} from "lucide-react";
import { useOrderStore } from "@/stores/order-store";
import { useConversationStore } from "@/stores/conversation-store";
import { useBusinessStore } from "@/stores/business-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnboardingProgressCard } from "@/components/onboarding/onboarding-progress-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { StatsSkeleton, CardSkeleton } from "@/components/shared/skeletons";
import { formatCurrency, formatTimeAgo, truncate, cn } from "@/lib/utils";

const statCards = [
  {
    labelKey: "dashboard.total_orders",
    icon: ShoppingBag,
    bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    labelKey: "dashboard.revenue",
    icon: DollarSign,
    bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  {
    labelKey: "dashboard.pending_orders",
    icon: Clock,
    bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    labelKey: "dashboard.active_conversations",
    icon: MessageSquare,
    bg: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
] as const;

export default function DashboardPage() {
  const { t } = useLanguage();
  const { orders, isLoading: ordersLoading, fetchOrders } = useOrderStore();
  const { conversations, isLoading: convosLoading, fetchConversations } =
    useConversationStore();
  const { business } = useBusinessStore();

  const isNotOnboarded =
    business?.onboarding && !business.onboarding.isComplete;

  const [bannerDismissed, setBannerDismissed] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (business?.id) {
      const key = `whatsapp-banner-dismissed-${business.id}`;
      if (localStorage.getItem(key) === "true") {
        setBannerDismissed(true);
      }
    }
  }, [business?.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const dismissBanner = () => {
    if (!business?.id) return;
    const key = `whatsapp-banner-dismissed-${business.id}`;
    localStorage.setItem(key, "true");
    setBannerDismissed(true);
  };

  useEffect(() => {
    fetchOrders();
    fetchConversations();
  }, [fetchOrders, fetchConversations]);

  const isLoading = ordersLoading || convosLoading;

  const totalRevenue = useMemo(
    () => orders.reduce((sum, o) => sum + o.totalPrice, 0),
    [orders]
  );

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "pending").length,
    [orders]
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5),
    [orders]
  );

  const recentConversations = useMemo(
    () =>
      [...conversations]
        .sort((a, b) => {
          const lastA = a.messages?.slice(-1)[0];
          const lastB = b.messages?.slice(-1)[0];
          if (!lastA && !lastB) return 0;
          if (!lastA) return 1;
          if (!lastB) return -1;
          return (
            new Date(lastB.createdAt).getTime() -
            new Date(lastA.createdAt).getTime()
          );
        })
        .slice(0, 5),
    [conversations]
  );

  const stats = useMemo(
    () => [
      orders.length,
      formatCurrency(totalRevenue),
      pendingCount,
      conversations.length,
    ],
    [orders.length, totalRevenue, pendingCount, conversations.length]
  );

  if (isLoading && orders.length === 0 && conversations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-28 animate-pulse rounded-md bg-muted" />
        <StatsSkeleton />
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-card shadow-sm">
            <div className="flex flex-row items-center justify-between p-6 pb-2">
              <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="px-6 pb-6">
              <CardSkeleton count={5} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>

      {/* WhatsApp Setup Banner */}
      {isNotOnboarded && !bannerDismissed && (
        <div className="flex items-center gap-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Radio className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {t("dashboard.whatsapp_setup_banner")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.whatsapp_setup_desc")}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/whatsapp">{t("dashboard.setup")}</Link>
          </Button>
          <button
            onClick={dismissBanner}
            className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Onboarding Progress */}
      <OnboardingProgressCard />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={stat.labelKey}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className={cn("rounded-lg p-2.5", stat.bg)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight tabular-nums">
                  {stats[i]}
                </p>
                <p className="text-sm text-muted-foreground">{t(stat.labelKey)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>{t("dashboard.recent_orders")}</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/orders">
              {t("orders.title")}
              <ArrowUpRight className="ms-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title={t("dashboard.no_orders")}
              description={t("dashboard.no_orders_desc")}
            />
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        #{order.referenceId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(order.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <span className="text-sm font-medium tabular-nums">
                      {formatCurrency(order.totalPrice)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Conversations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>{t("dashboard.recent_conversations")}</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/conversations">
              {t("conversations.title")}
              <ArrowUpRight className="ms-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentConversations.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title={t("dashboard.no_conversations")}
              description={t("dashboard.no_conversations_desc")}
            />
          ) : (
            <div className="space-y-2">
              {recentConversations.map((conv) => {
                const lastMsg = conv.messages?.slice(-1)[0];
                return (
                  <Link
                    key={conv.id}
                    href={`/conversations/${conv.phone}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {conv.name || conv.phone}
                      </p>
                      {lastMsg && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {truncate(lastMsg.content, 60)}
                        </p>
                      )}
                    </div>
                    <div className="ms-3 shrink-0">
                      {lastMsg && (
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
