"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
}

function formatTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function generateBotResponse(userText: string): string {
  const lower = userText.toLowerCase();

  if (lower.includes("shawarma") || lower.includes("شاورما")) {
    return "Great choice! 1 chicken shawarma is 15 SAR. How many would you like? I can also add drinks or sides.";
  }

  if (
    lower.includes("order") ||
    lower.includes("طلب") ||
    lower.includes("menu") ||
    lower.includes("قائمة")
  ) {
    return "Got it! Your order has been noted. Is there anything else you'd like to add? We also have fresh juices and desserts.";
  }

  if (lower.includes("price") || lower.includes("سعر") || lower.includes("كم")) {
    return "Our prices are very competitive! Chicken shawarma: 15 SAR, Beef shawarma: 18 SAR, Mixed grill: 35 SAR. Check our full menu for more options.";
  }

  if (lower.includes("hi") || lower.includes("hello") || lower.includes("مرحبا") || lower.includes("السلام")) {
    return "Welcome to Nadil AI! How can I help you today? You can order food, ask about the menu, or book a table.";
  }

  if (lower.includes("thanks") || lower.includes("thank") || lower.includes("شكرا")) {
    return "You're welcome! Your AI waiter is always here to help. Enjoy your meal!";
  }

  return "Got it! Is there anything else I can help you with? I can assist with ordering, menu questions, and reservations.";
}

export function InlineSimulator() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Welcome! I'm your Nadil AI waiter. You can order food, ask about the menu, or book a table. How can I help?",
      time: formatTime(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: trimmed,
      time: formatTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: generateBotResponse(trimmed),
        time: formatTime(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  }, [inputValue, isTyping]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="rounded-3xl border-4 border-slate-800 max-w-sm mx-auto bg-white shadow-xl overflow-hidden">
      {/* Chat header */}
      <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#6366F1] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-white text-sm">Nadil AI</h4>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
            <span className="text-xs text-emerald-300">Online</span>
          </div>
        </div>
      </div>

      {/* Message area */}
      <div
        className="h-64 overflow-y-auto px-4 py-3 space-y-3"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.sender === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] px-3 py-2 rounded-lg text-sm shadow-sm",
                msg.sender === "user"
                  ? "bg-[#DCF8C6] text-[#1E1B4B] rounded-br-sm"
                  : "bg-white text-[#1E1B4B] rounded-bl-sm border border-slate-100"
              )}
            >
              <p>{msg.text}</p>
              <span className="block text-xs text-slate-400 mt-0.5 text-right">
                {msg.time}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-lg rounded-bl-sm px-3 py-2 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="bg-slate-50 px-3 py-2 flex items-center gap-2 border-t border-slate-100">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]/30 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isTyping}
          className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:bg-[#1ebe5b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
