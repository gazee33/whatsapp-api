"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/language-context";
import { Users, ChevronRight, Search, Flag, ShoppingBag, MessageSquare, TrendingUp } from "lucide-react";
import { useCrmStore } from "@/stores/crm-store";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonBlock } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

export default function CustomersPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const {
    customers,
    isLoadingList,
    search,
    sort,
    fetchCustomers,
    setSearch,
    setSort,
  } = useCrmStore();
  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = useCallback((val: string) => {
    setSearchInput(val);
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const currentSort = useCrmStore.getState().sort;
      fetchCustomers({ search: val, sort: currentSort });
    }, 300);
  }, [setSearch]);

  const handleSort = (newSort: string) => {
    setSort(newSort);
    fetchCustomers({ search, sort: newSort });
  };

  const totalRevenue = customers.reduce((s, c) => s + c.stats.totalSpent, 0);
  const repeatCustomers = customers.filter((c) => c.stats.totalOrders > 1).length;

  if (isLoadingList && customers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <SkeletonBlock className="h-7 w-32" />
          <SkeletonBlock className="mt-1 h-3 w-56" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <SkeletonBlock className="h-10 w-72 rounded-lg" />
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("crm.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("crm.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("crm.total_customers")}</p>
              <p className="text-xl font-bold">{customers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("crm.total_revenue")}</p>
              <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("crm.repeat_customers")}</p>
              <p className="text-xl font-bold">{repeatCustomers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t("crm.search_placeholder")}
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("crm.sort_label")}</span>
          <select
            value={sort}
            onChange={(e) => handleSort(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          >
            <option value="recent">{t("crm.sort_recent")}</option>
            <option value="name">{t("crm.sort_name")}</option>
            <option value="orders">{t("crm.sort_orders")}</option>
            <option value="spent">{t("crm.sort_spent")}</option>
          </select>
        </div>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("crm.no_customers")}
          description={t("crm.no_customers_desc")}
        />
      ) : (
        <div className="grid gap-3">
          {customers.map((customer) => (
            <Card
              key={customer.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/customers/${customer.id}`)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <span className="text-sm font-semibold">
                      {customer.name
                        ? customer.name.charAt(0).toUpperCase()
                        : customer.phone.slice(-2)}
                    </span>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">
                        {customer.name || customer.phone}
                      </span>
                      {customer.flaggedForSupport && (
                        <Flag className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {customer.name && <span>{customer.phone}</span>}
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" />
                        {customer.stats.totalOrders}
                      </span>
                      <span>{formatCurrency(customer.stats.totalSpent)}</span>
                      {customer.stats.lastOrderDate && (
                        <span>{formatDate(customer.stats.lastOrderDate)}</span>
                      )}
                      {customer.stats.favoriteItem && (
                        <span className="hidden sm:inline text-xs">
                          ★ {customer.stats.favoriteItem}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {customer.stats.openComplaints > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      {customer.stats.openComplaints}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
