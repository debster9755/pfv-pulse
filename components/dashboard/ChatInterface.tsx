"use client";

import { useState } from "react";
import { Send, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  onProductAdded?: (productId: string) => void;
}

export function ChatInterface({ onProductAdded }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to PFV-Pulse. Tell me the target product and competitors to track — e.g. \"Track HP Omen 16 against Lenovo Legion 5 and Asus ROG Strix G16\".",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await processCommand(userMsg.content);
      setMessages((prev) => [...prev, { role: "assistant", content: reply.message }]);
      if (reply.productId && onProductAdded) onProductAdded(reply.productId);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function processCommand(text: string): Promise<{ message: string; productId?: string }> {
    const lower = text.toLowerCase();

    // Parse "track X against Y and Z" pattern
    const trackMatch = lower.match(/track\s+(.+?)(?:\s+against\s+(.+))?$/i);
    if (trackMatch) {
      const targetName = trackMatch[1]?.trim();
      const competitorStr = trackMatch[2] ?? "";
      const competitors = competitorStr.split(/\s+and\s+|\s*,\s*/).map((s) => s.trim()).filter(Boolean);

      if (targetName) {
        // Create target product
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: targetName,
            brand: targetName.split(" ")[0],
            sku: `sku-${Date.now()}`,
            msrp: 0,
            isTarget: true,
          }),
        });
        const data = await res.json();
        const productId = data.product?.id;

        // Create all competitors in parallel — don't await sequentially
        await Promise.allSettled(
          competitors.map((name, i) =>
            fetch("/api/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                brand: name.split(" ")[0],
                sku: `sku-comp-${i}-${targetName.replace(/\s/g, "").toLowerCase()}`,
                msrp: 0,
                isTarget: false,
              }),
            })
          )
        );

        const competitorMsg = competitors.length
          ? ` Competitors tracked: ${competitors.join(", ")}.`
          : "";
        return {
          message: `Tracking **${targetName}** — prices loading now.${competitorMsg} The dashboard will populate below.`,
          productId,
        };
      }
    }

    // Search for existing product
    const searchMatch = lower.match(/(?:search|find|show|analyze)\s+(.+)/i);
    if (searchMatch) {
      const query = searchMatch[1]?.trim();
      const res = await fetch(`/api/products?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const found = data.products ?? [];
      if (found.length === 0) return { message: `No products found for "${query}". Try: "Track ${query} against [competitor]"` };
      return {
        message: `Found ${found.length} product(s): ${found.map((p: { name: string }) => p.name).join(", ")}. Click one in the dashboard to load analytics.`,
        productId: found[0]?.id,
      };
    }

    return {
      message: `I can help you:\n• **Track** a product: "Track HP Omen 16 against Lenovo Legion 5"\n• **Find** existing: "Show HP Omen 16"\n• **Add** a product via the dashboard search bar above.`,
    };
  }

  return (
    <div className="flex flex-col h-80 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">PFV-Pulse Assistant</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="shrink-0 mt-0.5">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-blue-600" />
                </div>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 mt-0.5">
                <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-xl px-3.5 py-2.5">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-gray-100">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Track HP Omen 16 against Lenovo Legion 5"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
