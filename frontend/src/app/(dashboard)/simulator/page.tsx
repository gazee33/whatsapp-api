"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, RotateCcw } from "lucide-react";
import { useSimulatorStore } from "@/stores/simulator-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatDateShort } from "@/lib/utils";

function SimMessage({ message }: { message: { role: string; content: string; timestamp: string } }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
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
          {formatDateShort(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

export default function SimulatorPage() {
  const { messages, isLoading, error, sendMessage, reset } = useSimulatorStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage(text);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Simulator</h1>
          <p className="text-sm text-muted-foreground">
            Test how the AI assistant responds to customer messages
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          disabled={isLoading || messages.length === 0}
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border bg-card p-4 sm:p-6">
        {messages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Send a test message"
            description="Type a message below to simulate a customer and see how the AI assistant responds."
          />
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <SimMessage key={i} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm text-foreground">
                  <span className="inline-flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a customer message..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={!input.trim() || isLoading} loading={isLoading}>
          <Send className="h-4 w-4" />
          Send
        </Button>
      </div>
    </div>
  );
}
