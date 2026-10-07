import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Award,
  CheckCircle,
  Flame,
  Heart,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  Volume2,
} from "lucide-react";
import type { CustomerVoiceData } from "../types";

export function CustomerVoice({ customerVoice }: { customerVoice?: CustomerVoiceData }) {
  const [activeTab, setActiveTab] = useState<"all" | "love" | "dislike">("all");

  if (!customerVoice) {
    return (
      <section className="panel" style={{ textAlign: "center", padding: "48px 24px", marginTop: "24px" }}>
        <Volume2 size={40} style={{ color: "var(--accent-mint)", margin: "0 auto 16px" }} />
        <h3 style={{ fontSize: "20px", color: "#ffffff", marginBottom: "8px" }}>Insufficient Customer Voice Data</h3>
        <p style={{ color: "var(--text-secondary)", maxWidth: "520px", margin: "0 auto" }}>
          Additional reviews are needed to extract structured sentiment themes and customer voice intelligence.
        </p>
      </section>
    );
  }

  const { sentiment_breakdown, themes, customers_love, customers_dislike, priorities, review_wall } = customerVoice;

  return (
    <div className="customer-voice-container">
      {/* Header */}
      <div className="section-title">
        <div>
          <p className="eyebrow"><Volume2 size={13} /> VOICE OF THE CUSTOMER</p>
          <h2>Customer Voice & Sentiment Intelligence</h2>
          <p>Analyzing what verified buyers explicitly celebrate, criticize, and prioritize.</p>
        </div>
        <MessageSquare className="section-icon" />
      </div>

      {/* A. Customer Sentiment Breakdown & F. Customer Priorities */}
      <section className="voice-top-grid">
        {/* Sentiment breakdown card */}
        <div className="panel voice-sentiment-card">
          <div className="section-kicker">Aggregate Sentiment Distribution</div>
          <h3>Sentiment Balance</h3>

          <div className="sentiment-ratio-bar">
            <div className="seg pos" style={{ width: `${sentiment_breakdown.positive_pct}%` }} />
            <div className="seg neu" style={{ width: `${sentiment_breakdown.neutral_pct}%` }} />
            <div className="seg neg" style={{ width: `${sentiment_breakdown.negative_pct}%` }} />
          </div>

          <div className="sentiment-stats-row">
            <div className="sentiment-stat-item positive">
              <span className="stat-label">🟢 Positive</span>
              <strong className="stat-pct">{sentiment_breakdown.positive_pct}%</strong>
              <small className="stat-count">{sentiment_breakdown.positive_count} reviews</small>
            </div>
            <div className="sentiment-stat-item neutral">
              <span className="stat-label">⚪ Neutral</span>
              <strong className="stat-pct">{sentiment_breakdown.neutral_pct}%</strong>
              <small className="stat-count">{sentiment_breakdown.neutral_count} reviews</small>
            </div>
            <div className="sentiment-stat-item negative">
              <span className="stat-label">🔴 Negative</span>
              <strong className="stat-pct">{sentiment_breakdown.negative_pct}%</strong>
              <small className="stat-count">{sentiment_breakdown.negative_count} reviews</small>
            </div>
          </div>
        </div>

        {/* Priorities card */}
        <div className="panel voice-priorities-card">
          <div className="section-kicker">Customer Priorities & Focus</div>
          <h3>Key Customer Priorities</h3>

          <div className="priority-list">
            <div className="priority-row">
              <span className="p-label"><Award size={14} style={{ color: "#38bdf8" }} /> Most Discussed Area</span>
              <strong className="p-val">{priorities.most_discussed_aspect}</strong>
            </div>
            <div className="priority-row">
              <span className="p-label"><ThumbsUp size={14} style={{ color: "#34d399" }} /> Top Praise Category</span>
              <strong className="p-val highlight-pos">{priorities.most_positive_aspect}</strong>
            </div>
            <div className="priority-row">
              <span className="p-label"><ThumbsDown size={14} style={{ color: "#f87171" }} /> Top Criticism Category</span>
              <strong className="p-val highlight-neg">{priorities.most_negative_aspect}</strong>
            </div>
            <div className="priority-row">
              <span className="p-label"><Sparkles size={14} style={{ color: "#fbbf24" }} /> Growth Opportunity</span>
              <strong className="p-val">{priorities.biggest_opportunity}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* C. WHAT CUSTOMERS LOVE vs D. WHAT CUSTOMERS DISLIKE */}
      <section className="love-dislike-section">
        <div className="love-dislike-grid">
          {/* Customers Love */}
          <div className="love-column">
            <div className="col-header love">
              <div className="icon-badge love"><Heart size={16} /></div>
              <div>
                <h3>What Customers Love</h3>
                <span>Top verified satisfaction drivers</span>
              </div>
            </div>

            <div className="cards-stack">
              {customers_love.length > 0 ? (
                customers_love.map((item, idx) => (
                  <article className="love-card" key={idx}>
                    <div className="love-card-top">
                      <span className="feature-title">{item.feature}</span>
                      <span className="score-tag pos">{item.score}/100</span>
                    </div>
                    <p className="love-why">{item.why_valued}</p>
                    <div className="evidence-snippet">
                      <span className="quote-mark">“</span>
                      <span>{item.evidence}</span>
                    </div>
                    <div className="card-sub-stat">
                      <span>Positive ratio: <b>{item.positive_pct}%</b></span>
                      <span>Mentions: <b>{item.mentions}</b></span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="panel empty-state">No dominant positive aspects recorded.</div>
              )}
            </div>
          </div>

          {/* Customers Dislike */}
          <div className="dislike-column">
            <div className="col-header dislike">
              <div className="icon-badge dislike"><Flame size={16} /></div>
              <div>
                <h3>What Customers Dislike</h3>
                <span>Recurring friction points & complaints</span>
              </div>
            </div>

            <div className="cards-stack">
              {customers_dislike.length > 0 ? (
                customers_dislike.map((item, idx) => (
                  <article className="dislike-card" key={idx}>
                    <div className="dislike-card-top">
                      <span className="problem-title">{item.problem}</span>
                      <span className="score-tag neg">{item.negative_pct}% Negative</span>
                    </div>
                    <p className="dislike-impact">{item.potential_impact}</p>
                    <div className="evidence-snippet neg">
                      <span className="quote-mark">“</span>
                      <span>{item.evidence}</span>
                    </div>
                    <div className="card-sub-stat">
                      <span>Complaint frequency: <b>{item.frequency} mention{item.frequency === 1 ? "" : "s"}</b></span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="panel empty-state" style={{ color: "#6ee7b7" }}>
                  🎉 No significant customer complaints detected across analyzed reviews!
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* B. Customer Themes */}
      {themes && themes.length > 0 && (
        <section className="customer-themes-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">RECURRING CONVERSATIONS</p>
              <h2>Customer Intelligence Themes</h2>
              <p>Clustering verified opinions across core product dimensions.</p>
            </div>
          </div>

          <div className="themes-grid">
            {themes.map((theme, i) => (
              <article key={i} className={`theme-card ${theme.sentiment}`}>
                <div className="theme-card-header">
                  <h4>{theme.name}</h4>
                  <span className={`theme-sentiment-badge ${theme.sentiment}`}>
                    {theme.sentiment}
                  </span>
                </div>
                <div className="theme-score-bar">
                  <div className="theme-bar-fill" style={{ width: `${theme.score}%` }} />
                </div>
                <div className="theme-meta-row">
                  <span>Aspect Score: <b>{theme.score}/100</b></span>
                  <span>Mentions: <b>{theme.mentions}</b></span>
                </div>
                <p className="theme-evidence">{theme.evidence}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* E. Customer Voice Wall */}
      {review_wall && review_wall.length > 0 && (
        <section className="review-wall-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">RAW REVIEW SAMPLES</p>
              <h2>Customer Voice Wall</h2>
              <p>Authentic customer quotes demonstrating the spectrum of feedback.</p>
            </div>
          </div>

          <div className="voice-wall-grid">
            {review_wall.map((rev) => (
              <article className="voice-wall-card" key={rev.id}>
                <div className="wall-card-top">
                  <span className="wall-stars">{"★".repeat(Math.round(rev.rating))}</span>
                  <span className={`badge ${rev.sentiment}`}>{rev.sentiment}</span>
                  {rev.emotion && <span className="badge neutral">{rev.emotion}</span>}
                </div>
                <h4 className="wall-title">{rev.title}</h4>
                <p className="wall-text">{rev.text}</p>
                <footer className="wall-footer">
                  <ShieldCheck size={13} style={{ color: "#34d399" }} />
                  <span>Credibility: <b>{rev.credibility}%</b></span>
                  {rev.date && <span>{rev.date}</span>}
                </footer>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
