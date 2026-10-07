import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  RotateCcw,
  Bot,
  User,
  ArrowRight,
  HelpCircle,
  Flame,
  ShieldCheck,
  TrendingUp,
  Lightbulb,
  Layers,
  ChevronRight,
  MessageSquare,
  Compass,
} from "lucide-react";
import { api } from "../api/client";
import type { Analytics, ChatMessage } from "../types";

interface AIAssistantProps {
  analytics: Analytics;
  activeTab: string;
  onNavigateTab: (tab: any) => void;
  comparedProductId?: number;
}

const QUICK_PROMPTS = [
  { label: "⚡ Summarize Product", query: "Summarize this product and its key takeaways." },
  { label: "⚠️ Biggest Weakness", query: "What is the biggest problem and complaint with this product?" },
  { label: "❤️ What Customers Love", query: "What do customers like most about this product?" },
  { label: "🛠️ What to Fix First", query: "What should the company fix first and what is the improvement roadmap?" },
  { label: "🎯 Explain AI Score", query: "Explain the AI product score and how it is calculated." },
  { label: "📊 Sentiment Balance", query: "Explain the customer satisfaction and sentiment breakdown." },
  { label: "🛡️ Credibility Audit", query: "What does the review credibility and accuracy audit mean?" },
  { label: "🧭 Dashboard Guide", query: "Guide me around ReviewOS: what should I look at first and where are complaints?" },
];

function formatMessageContent(content: string) {
  // Simple, safe Markdown-like formatter for headers, bold text, quotes, and bullets
  const lines = content.split("\n");
  return lines.map((line, idx) => {
    let trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="msg-spacer" />;

    // Headers
    if (trimmed.startsWith("### ")) {
      return (
        <h4 key={idx} className="msg-heading">
          {trimmed.replace("### ", "")}
        </h4>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={idx} className="msg-heading-lg">
          {trimmed.replace("## ", "")}
        </h3>
      );
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      return (
        <blockquote key={idx} className="msg-quote">
          {trimmed.replace(/^>\s*/, "").replace(/^"|"$/g, "")}
        </blockquote>
      );
    }

    // Bullet points
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const bulletText = trimmed.substring(2);
      return (
        <div key={idx} className="msg-bullet">
          <span className="bullet-dot">•</span>
          <div>{renderFormattedText(bulletText)}</div>
        </div>
      );
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      return (
        <div key={idx} className="msg-numbered">
          <span className="num-badge">{numMatch[1]}</span>
          <div>{renderFormattedText(numMatch[2])}</div>
        </div>
      );
    }

    return (
      <p key={idx} className="msg-paragraph">
        {renderFormattedText(trimmed)}
      </p>
    );
  });
}

function renderFormattedText(text: string) {
  // Bold formatting **text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function AIAssistant({ analytics, activeTab, onNavigateTab, comparedProductId }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize welcome message when product changes or on first mount
  useEffect(() => {
    if (analytics) {
      const welcome: ChatMessage = {
        id: `welcome-${analytics.product.id}`,
        role: "assistant",
        content: `### 🤖 ReviewOS Intelligence Guide Ready\n\nI have synthesized intelligence from **${analytics.review_count} verified customer reviews** for **${analytics.product.name}**.\n\n* **AI Product Score:** **${analytics.ai_score}/100** (${analytics.recommendation})\n* **Customer Satisfaction:** **${analytics.satisfaction}%**\n* **Review Credibility:** **${analytics.credibility}%**\n\nAsk me any question below, or select a suggested prompt to explore friction points, customer favorites, or improvement roadmaps.`,
        timestamp: new Date(),
        sources: [
          `${analytics.review_count} Verified Reviews`,
          "Explainable AI Engine",
          "Customer Voice",
        ],
        suggested_questions: [
          "What is the biggest problem?",
          "What do customers like most?",
          "What should we fix first?",
          "Summarize this product",
        ],
      };
      setMessages([welcome]);
    }
  }, [analytics.product.id]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build conversation history for multi-turn context
      const historyPayload = messages
        .filter((m) => !m.id.startsWith("welcome"))
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.assistantChat({
        productId: analytics.product.id,
        question: query,
        history: historyPayload,
        comparedProductId,
        activeTab,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        timestamp: new Date(),
        sources: res.sources,
        suggested_actions: res.suggested_actions,
        suggested_questions: res.suggested_questions,
        navigate_to_tab: res.navigate_to_tab,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Intelligence Service Notice**\n\n${err?.message || "Could not complete analysis query. You can continue exploring the ReviewOS dashboard analytics tabs directly."}`,
        timestamp: new Date(),
        sources: ["System Guardrail"],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    const welcome: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      content: `### 🔄 Session Reset\n\nReady for new queries on **${analytics.product.name}** (${analytics.review_count} verified reviews). How can I assist you?`,
      timestamp: new Date(),
      sources: [`${analytics.review_count} Verified Reviews`],
      suggested_questions: [
        "What is the biggest problem?",
        "What should the company fix first?",
        "Explain the AI product score",
      ],
    };
    setMessages([welcome]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        id="reviewos-ai-trigger"
        className={`ai-floating-trigger ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Open ReviewOS AI Intelligence Guide"
        aria-label="Open AI Assistant"
      >
        <div className="trigger-glow" />
        <div className="trigger-inner">
          <Sparkles size={20} className="trigger-icon" />
          <span className="trigger-label">AI Guide</span>
          <span className="trigger-status-pulse" />
        </div>
      </button>

      {/* Floating Glassmorphic Chat Panel */}
      {isOpen && (
        <aside className="ai-chat-window" aria-label="ReviewOS AI Intelligence Assistant">
          {/* Header */}
          <header className="ai-chat-header">
            <div className="ai-header-left">
              <div className="ai-avatar">
                <Bot size={18} />
                <span className="ai-avatar-online" />
              </div>
              <div className="ai-header-text">
                <div className="ai-title-row">
                  <h3>ReviewOS AI Guide</h3>
                  <span className="ai-tag">Grounded NLP</span>
                </div>
                <p className="ai-context-indicator" title={analytics.product.name}>
                  {analytics.product.name.slice(0, 32)}
                  {analytics.product.name.length > 32 ? "..." : ""} ·{" "}
                  <b>{analytics.ai_score}/100</b>
                </p>
              </div>
            </div>

            <div className="ai-header-actions">
              <button
                type="button"
                className="ai-action-btn"
                onClick={handleClearChat}
                title="Reset Conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                className="ai-action-btn close"
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
              >
                <X size={17} />
              </button>
            </div>
          </header>

          {/* Quick Suggested Actions Carousel */}
          <div className="ai-quick-prompts-bar">
            <div className="quick-prompts-track">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="quick-prompt-chip"
                  onClick={() => handleSend(p.query)}
                  disabled={loading}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Body */}
          <div className="ai-messages-container">
            {messages.map((m) => (
              <div key={m.id} className={`ai-message-row ${m.role}`}>
                <div className="ai-msg-avatar">
                  {m.role === "assistant" ? <Sparkles size={14} /> : <User size={14} />}
                </div>

                <div className="ai-msg-content-wrapper">
                  <div className="ai-msg-bubble">{formatMessageContent(m.content)}</div>

                  {/* Sources / Evidence Indicator */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="ai-msg-sources">
                      <span className="sources-label">📌 Grounded in:</span>
                      {m.sources.map((src, i) => (
                        <span key={i} className="source-pill">
                          {src}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Navigation Action Buttons */}
                  {m.navigate_to_tab && (
                    <div className="ai-navigation-actions">
                      <button
                        type="button"
                        className="ai-nav-action-btn"
                        onClick={() => {
                          onNavigateTab(m.navigate_to_tab);
                        }}
                      >
                        <Compass size={13} />
                        <span>
                          Jump to {m.navigate_to_tab === "voice" ? "Customer Voice" : m.navigate_to_tab === "roadmap" ? "Improvement Roadmap" : m.navigate_to_tab === "insights" ? "Smart Key Insights" : m.navigate_to_tab === "compare" ? "Product Comparison" : m.navigate_to_tab === "reviews" ? "Review Evidence" : "Executive Overview"}
                        </span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  )}

                  {/* Follow-up Suggested Questions */}
                  {m.suggested_questions && m.suggested_questions.length > 0 && (
                    <div className="ai-followup-container">
                      <span className="followup-title">Suggested follow-ups:</span>
                      <div className="followup-chips">
                        {m.suggested_questions.map((qText, qi) => (
                          <button
                            key={qi}
                            type="button"
                            className="followup-chip"
                            onClick={() => handleSend(qText)}
                            disabled={loading}
                          >
                            <span>{qText}</span>
                            <ArrowRight size={11} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="ai-message-row assistant">
                <div className="ai-msg-avatar loading">
                  <Sparkles size={14} className="pulse-spin" />
                </div>
                <div className="ai-msg-content-wrapper">
                  <div className="ai-msg-bubble loading-bubble">
                    <div className="ai-typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="loading-text">Synthesizing review evidence...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            className="ai-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <div className="ai-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                placeholder={`Ask about ${analytics.product.name.slice(0, 20)}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="ai-text-input"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="ai-send-btn"
                title="Send Question"
              >
                <Send size={15} />
              </button>
            </div>
            <div className="ai-input-footer">
              <span>Strictly grounded in verified customer review analytics</span>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
