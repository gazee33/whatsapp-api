"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/language-context";
import { MessageSquare, ChevronRight } from "lucide-react";
import { useConversationStore } from "@/stores/conversation-store";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonBlock } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { formatTimeAgo, truncate } from "@/lib/utils";

export default function ConversationsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { conversations, isLoading, fetchConversations } =
    useConversationStore();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  if (isLoading && conversations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="mt-1 h-3 w-64" />
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <SkeletonBlock className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-4 w-32" />
                    <SkeletonBlock className="h-4 w-8 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-3 w-48" />
                  <SkeletonBlock className="h-3 w-80" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-3 w-10" />
                <SkeletonBlock className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("conversations.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("conversations.subtitle")}
        </p>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={t("conversations.no_conversations")}
          description={t("conversations.no_conversations_desc")}
        />
      ) : (
        <div className="grid gap-3">
          {conversations.map((customer) => {
            const lastMessage = customer.messages?.[customer.messages.length - 1];

            return (
              <Card
                key={customer.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() =>
                  router.push(`/conversations/${customer.phone}`)
                }
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <span className="text-sm font-semibold">
                        {customer.name
                          ? customer.name.charAt(0).toUpperCase()
                          : customer.phone.slice(-2)}
                      </span>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {customer.name || customer.phone}
                        </span>
                        {customer._count && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {customer._count.messages}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {customer.name && (
                          <span>{customer.phone}</span>
                        )}
                      </div>
                      {lastMessage && (
                        <p className="text-sm text-muted-foreground truncate max-w-[180px] sm:max-w-[300px]">
                          {lastMessage.role === "user" ? t("conversations.customer_prefix") : t("conversations.bot_prefix")}
                          {truncate(lastMessage.content, 80)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(lastMessage.createdAt)}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
