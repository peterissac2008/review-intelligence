import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { SmartInsightsData } from "../types";

export function SmartInsights({ smartInsights }: { smartInsights?: SmartInsightsData }) {
  const [filter, setFilter] = useState<string>("all");

  if (!smartInsights || !smartInsights.insights || smartInsights.insights.length === 0) {
    return (
      <section className="panel" style={{ textAlign: "center", padding: "48px 24px", marginTop: "24px" }}>
        <Lightbulb size={40} style={{ color: "var(--accent-mint)", margin: "0 auto 16px" }} />
        <h3 style={{ fontSize: "20px", color: "#ffffff", marginBottom: "8px" }}>Insufficient Data for Smart Insights</h3>
        <p style={{ color: "var(--text-secondary)", maxWidth: "520px", margin: "0 auto" }}>
          Additional reviews are needed to compute statistically meaningful cross-aspect insights.
        </p>
      </section>
    );
  }

  const { insights, key_takeaways } = smartInsights;

  const filtered = filter === "all"
    ? insights
    : insights.filter((ins) => ins.priority.toLowerCase() === filter.toLowerCase());

  const getImpactBadgeClass = (impact: string) => {
    switch (impact) {
      case "Critical Alert": return "critical";
      case "High Impact": return "high";
      case "Positive Anchor": return "positive";
      default: return "medium";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Major Strength": return <Award size={16} style={{ color: "#34d399" }} />;
      case "Major Weakness": return <AlertTriangle size={16} style={{ color: "#f87171" }} />;
      case "Satisfaction Driver": return <TrendingUp size={16} style={{ color: "#38bdf8" }} />;
      default: return <Sparkles size={16} style={{ color: "#fbbf24" }} />;
    }
  };

  return (
    <div className="smart-insights-container">
      {/* Header */}
      <div className="section-title">
        <div>
          <p className="eyebrow"><Sparkles size={13} /> INTELLIGENCE SYNTHESIS</p>
          <h2>Smart Key Insights & Executive Takeaways</h2>
          <p>Critical observations, growth levers, and risk factors derived from deep multi-signal review processing.</p>
        </div>
        <Lightbulb className="section-icon" />
      </div>

      {/* E. Executive Summary: Key Takeaways Card */}
      <section className="takeaways-panel">
        <div className="takeaways-header">
          <div className="glow-badge"><Target size={14} /> Executive Briefing</div>
          <h3>Executive Key Takeaways</h3>
          <p>Instant answers to the four fundamental product health questions.</p>
        </div>

        <div className="takeaways-grid">
          <div className="takeaway-box working">
            <div className="takeaway-title">
              <CheckCircle2 size={16} className="t-icon pos" />
              <span>What Is Working?</span>
            </div>
            <ul>
              {key_takeaways.what_is_working.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="takeaway-box failing">
            <div className="takeaway-title">
              <AlertTriangle size={16} className="t-icon neg" />
              <span>What Is Failing / Friction?</span>
            </div>
            <ul>
              {key_takeaways.what_is_failing.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="takeaway-box care">
            <div className="takeaway-title">
              <Zap size={16} className="t-icon care" />
              <span>What Customers Care About</span>
            </div>
            <ul>
              {key_takeaways.what_customers_care_about.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="takeaway-box improve">
            <div className="takeaway-title">
              <ArrowRight size={16} className="t-icon improve" />
              <span>What Should Be Improved</span>
            </div>
            <ul>
              {key_takeaways.what_should_be_improved.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Filter Tabs for Insights */}
      <div className="section-title" style={{ marginTop: "40px" }}>
        <div>
          <p className="eyebrow">RANKED FINDINGS</p>
          <h2>Detailed Diagnostic Insights</h2>
        </div>
        <div className="priority-filters">
          <button
            type="button"
            className={`filter-chip ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Insights ({insights.length})
          </button>
          <button
            type="button"
            className={`filter-chip critical ${filter === "critical" ? "active" : ""}`}
            onClick={() => setFilter("critical")}
          >
            🔴 Critical Alert
          </button>
          <button
            type="button"
            className={`filter-chip high ${filter === "high" ? "active" : ""}`}
            onClick={() => setFilter("high")}
          >
            🟠 High Impact
          </button>
          <button
            type="button"
            className={`filter-chip low ${filter === "medium" || filter === "low" ? "active" : ""}`}
            onClick={() => setFilter("low")}
          >
            🟢 Low / Positive
          </button>
        </div>
      </div>

      {/* D. Insight Visualization Grid */}
      <div className="insights-grid">
        <AnimatePresence mode="popLayout">
          {filtered.map((insight, idx) => (
            <motion.article
              key={insight.id}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              className={`insight-card ${insight.priority.toLowerCase()}`}
            >
              <div className="insight-top">
                <div className="insight-type-badge">
                  {getTypeIcon(insight.type)}
                  <span>{insight.type}</span>
                </div>
                <span className={`impact-badge ${getImpactBadgeClass(insight.impact_level)}`}>
                  {insight.impact_level}
                </span>
              </div>

              <h3 className="insight-title">{insight.title}</h3>
              <p className="insight-desc">{insight.explanation}</p>

              <div className="insight-metric-box">
                <span className="metric-label">Supporting Metric</span>
                <strong className="metric-text">{insight.supporting_metric}</strong>
              </div>

              <div className="insight-evidence-box">
                <span className="evidence-label">Supporting Review Evidence</span>
                <p>{insight.evidence}</p>
              </div>

              <div className="insight-why-box">
                <span className="why-label">Strategic Implication (Why This Matters)</span>
                <p>{insight.why_it_matters}</p>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
