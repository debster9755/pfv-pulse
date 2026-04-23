"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import PriceChart from "./PriceChart";
import ComparisonTable from "./ComparisonTable";
import EmptyState from "./EmptyState";
import type { ChatMessage, PriceChartRow, ComparisonRow, PriceSummary } from "@/types";

interface ApiChatResponse {
  type: string;
  message?: string;
  intent?: { brands: string[]; products: string[] };
  chart?: PriceChartRow[];
  tableData?: ComparisonRow[];
  table?: ComparisonRow[];
  serpSummary?: PriceSummary;
  dataAvailable?: boolean;
  historyQuery?: string;
  redirectTo?: string;
  query?: string;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const SUGGESTED_QUERIES = [
  "Give me the price for HP Omen Laptop options",
  "Compare HP Omen vs Lenovo Legion vs Asus ROG",
  "Show price history for HP Omen 16",
  "Give me revenue boost recommendation for HP Omen",
];

interface ChatInterfaceProps {
  onHistoryQuery?: (query: string) => void;
  onRecommendationRequest?: () => void;
}

export default function ChatInterface({ onHistoryQuery, onRecommendationRequest }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      type: "text",
      content:
        "Hello! I'm PFV-Pulse, your competitive pricing intelligence assistant.\n\nAsk me to:\n- **Fetch pricing** for a single product (rendered as a chart)\n- **Compare** HP vs competitors (rendered as a table with % deltas)\n- **Show price history** for a product\n- **Recommend** a revenue-optimized price\n\nOr try one of the suggestions below.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const userText = text.trim();
    if (!userText || loading) return;

    const userMsg: ChatMessage = { id: generateId(), role: "user", type: "text", content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
        signal: AbortSignal.timeout(22000),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: ApiChatResponse = await res.json();

      let assistantMsg: ChatMessage;

      if (data.type === "clarification") {
        assistantMsg = {
          id: generateId(),
          role: "assistant",
          type: "clarification",
          content: data.message ?? "Could you clarify what you're looking for?",
        };
      } else if (data.type === "single_product") {
        const chart = data.chart ?? [];
        const hasData = data.dataAvailable && chart.length > 0;
        const msgId = generateId();
        assistantMsg = {
          id: msgId,
          role: "assistant",
          type: hasData ? "chart" : "text",
          content: hasData
            ? `Found **${chart.length} products** from Best Buy. Fetching market pricing…`
            : "No pricing data found from Best Buy. The API key may be invalid or the product name too broad — try *\"HP Omen 16\"* for a more specific query.",
          chartData: chart,
          serpSummary: undefined,
        };
        // Fetch SerpApi market context in background — update the message when ready
        if (hasData && data.query) {
          fetch(`/api/prices?q=${encodeURIComponent(data.query)}`)
            .then((r) => r.json())
            .then((priceData) => {
              if (priceData?.serp?.average != null) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId
                      ? {
                          ...m,
                          content: `Found **${chart.length} products** from Best Buy. Market avg: **$${priceData.serp.average}** across ${priceData.serp.results?.length ?? 0} retailers.`,
                          serpSummary: priceData.serp,
                        }
                      : m
                  )
                );
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId
                      ? { ...m, content: `Found **${chart.length} products** from Best Buy.` }
                      : m
                  )
                );
              }
            })
            .catch(() => {/* non-fatal */});
        }
      } else if (data.type === "comparison") {
        const table = data.table ?? data.tableData ?? [];
        const hasData = data.dataAvailable && table.length > 0;
        assistantMsg = {
          id: generateId(),
          role: "assistant",
          type: hasData ? "table" : "text",
          content: hasData
            ? `Here's the comparison across **${table.length} brands**. % delta is relative to HP baseline.`
            : "Comparison data is unavailable. Check your SerpApi key or try again later.",
          tableData: table,
        };
      } else if (data.type === "redirect") {
        if (data.historyQuery) onHistoryQuery?.(data.historyQuery);
        if (data.redirectTo === "recommendation") onRecommendationRequest?.();
        assistantMsg = {
          id: generateId(),
          role: "assistant",
          type: "text",
          content: data.message ?? "Redirecting…",
        };
      } else if (data.type === "error") {
        assistantMsg = {
          id: generateId(),
          role: "assistant",
          type: "error",
          content: data.message ?? "An error occurred.",
        };
      } else {
        assistantMsg = {
          id: generateId(),
          role: "assistant",
          type: "text",
          content: data.message ?? "I'm not sure how to handle that request.",
        };
      }

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          type: "error",
          content: isTimeout
            ? "The request took too long — the pricing APIs may be rate-limited. Please try again in a moment."
            : "Something went wrong fetching pricing data. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function renderMessageContent(msg: ChatMessage) {
    if (msg.type === "chart" && msg.chartData) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.content}</p>
          {msg.serpSummary && (
            <div className="flex gap-4 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <span>Market Low: <strong className="text-gray-800">${msg.serpSummary.low?.toFixed(2) ?? "—"}</strong></span>
              <span>Avg: <strong className="text-gray-800">${msg.serpSummary.average?.toFixed(2) ?? "—"}</strong></span>
              <span>High: <strong className="text-gray-800">${msg.serpSummary.high?.toFixed(2) ?? "—"}</strong></span>
            </div>
          )}
          <PriceChart data={msg.chartData} />
        </div>
      );
    }
    if (msg.type === "table" && msg.tableData) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.content}</p>
          <ComparisonTable data={msg.tableData} />
        </div>
      );
    }
    if (msg.type === "error") {
      return (
        <div className="flex gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
          <p className="text-sm text-red-600">{msg.content}</p>
        </div>
      );
    }
    return (
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/\n/g, "<br/>"),
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 shrink-0">
        <div className="w-7 h-7 rounded-full bg-hp-blue flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-800">PFV-Pulse Intelligence Chat</h2>
          <p className="text-[10px] text-gray-400">Powered by live pricing data</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-6 h-6 shrink-0 rounded-full bg-hp-blue/10 flex items-center justify-center mt-0.5">
                <Bot className="w-3.5 h-3.5 text-hp-blue" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-hp-blue text-white rounded-br-sm"
                  : "bg-gray-50 border border-gray-100 rounded-bl-sm"
              }`}
            >
              {msg.role === "user" ? (
                <p className="text-sm font-medium text-black leading-relaxed">{msg.content}</p>
              ) : (
                renderMessageContent(msg)
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 shrink-0 rounded-full bg-gray-200 flex items-center justify-center mt-0.5">
                <User className="w-3.5 h-3.5 text-gray-500" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-6 h-6 shrink-0 rounded-full bg-hp-blue/10 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-hp-blue" />
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 text-hp-blue animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested queries */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap shrink-0">
          {SUGGESTED_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs bg-gray-100 hover:bg-hp-blue/10 hover:text-hp-blue border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about pricing, comparisons, or recommendations…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-hp-blue/30 focus:border-hp-blue transition-colors leading-snug"
            style={{ minHeight: 40, maxHeight: 120 }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-hp-blue hover:bg-hp-blue-dark disabled:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
