"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/language-context";
import { ArrowLeft, Phone, MessageSquare } from "lucide-react";
import { useConversationStore } from "@/stores/conversation-store";
import { Button } from "@/components/ui/button";
import { SkeletonBlock, ChatSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatDateShort } from "@/lib/utils";
import type { Message } from "@/lib/types";

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="max-w-md text-center text-xs italic text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={cn(
            "mt-1 text-right text-[10px]",
            isUser ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          {formatDateShort(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function SessionGroup({ sessionId, messages, t }: { sessionId: string; messages: Message[]; t: (key: string) => string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 py-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground shrink-0">
          {t("conv_detail.session")} {sessionId.slice(0, 8)}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
}

export default function ConversationDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const phone = decodeURIComponent(params.phone as string);
  const { currentConversation, isLoading, fetchConversation } =
    useConversationStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversation(phone);
  }, [fetchConversation, phone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConversation]);

  if (isLoading || !currentConversation) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-8 w-20" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SkeletonBlock className="h-7 w-48" />
            <div className="mt-1 flex items-center gap-3">
              <SkeletonBlock className="h-3.5 w-32" />
              <SkeletonBlock className="h-3.5 w-24" />
            </div>
          </div>
        </div>
      <div className="rounded-xl border bg-card p-4 sm:p-6">
          <ChatSkeleton />
        </div>
      </div>
    );
  }

  const { customer, sessions } = currentConversation;
  const sessionEntries = Object.entries(sessions);
  const totalMessages = sessionEntries.reduce(
    (sum, [, msgs]) => sum + msgs.length,
    0
  );

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="-ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {customer.name || customer.phone}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {customer.phone}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {totalMessages} {t("conv_detail.messages_count")}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        {sessionEntries.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={t("conv_detail.no_messages")}
            description={t("conv_detail.no_messages_desc")}
          />
        ) : (
          <div className="space-y-6">
            {sessionEntries.map(([sessionId, messages]) => (
              <SessionGroup
                key={sessionId}
                sessionId={sessionId}
                messages={messages}
                t={t}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
