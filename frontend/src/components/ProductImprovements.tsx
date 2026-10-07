import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lightbulb, TrendingUp, Wrench } from "lucide-react";
import type { ProductRecommendation } from "../types";

export function ProductImprovements({ recommendations }: { recommendations: ProductRecommendation[] }) {
  const [filter, setFilter] = useState<string>("all");

  const list = recommendations || [];
  const filtered = filter === "all"
    ? list
    : list.filter(r => r.priority_level === filter);

  const counts = {
    all: list.length,
    critical: list.filter(r => r.priority_level === "critical").length,
    high: list.filter(r => r.priority_level === "high").length,
    medium: list.filter(r => r.priority_level === "medium").length,
    low: list.filter(r => r.priority_level === "low").length,
  };

  return (
    <section className="improvements-section">
      <div className="section-title">
        <div>
          <p className="eyebrow">ACTIONABLE PRODUCT INTELLIGENCE</p>
          <h2>AI Product Improvement Recommendations</h2>
          <p>Prioritized engineering, supply chain, and quality actions extracted directly from real customer reviews.</p>
        </div>
        <Lightbulb />
      </div>

      <div className="priority-filter-bar">
        <button
          type="button"
          className={`filter-chip ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All Recommendations ({counts.all})
        </button>
        {counts.critical > 0 && (
          <button
            type="button"
            className={`filter-chip critical ${filter === "critical" ? "active" : ""}`}
            onClick={() => setFilter("critical")}
          >
            🔴 Critical ({counts.critical})
          </button>
        )}
        {counts.high > 0 && (
          <button
            type="button"
            className={`filter-chip high ${filter === "high" ? "active" : ""}`}
            onClick={() => setFilter("high")}
          >
            🟠 High ({counts.high})
          </button>
        )}
        {counts.medium > 0 && (
          <button
            type="button"
            className={`filter-chip medium ${filter === "medium" ? "active" : ""}`}
            onClick={() => setFilter("medium")}
          >
            🟡 Medium ({counts.medium})
          </button>
        )}
        {counts.low > 0 && (
          <button
            type="button"
            className={`filter-chip low ${filter === "low" ? "active" : ""}`}
            onClick={() => setFilter("low")}
          >
            🟢 Low ({counts.low})
          </button>
        )}
      </div>

      <div className="recommendations-grid">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            filtered.map((item, index) => (
              <motion.article
                key={item.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={`recommendation-card ${item.priority_level}`}
              >
                <div className="rec-header">
                  <div className="rec-domain-badge">
                    <span>{item.aspect}</span>
                  </div>
                  <span className={`priority-badge ${item.priority_level}`}>
                    {item.priority_badge || item.priority}
                  </span>
                </div>

                <h3 className="rec-problem">
                  <AlertTriangle size={17} className="problem-icon" />
                  <span>{item.problem}</span>
                </h3>

                <div className="rec-block evidence-block">
                  <span className="block-label">Review Evidence</span>
                  <p className="evidence-text">{item.evidence}</p>
                </div>

                <div className="rec-block action-block">
                  <span className="block-label">Recommended Improvement</span>
                  <div className="action-content">
                    <Wrench size={15} className="action-icon" />
                    <p>{item.recommendation}</p>
                  </div>
                </div>

                <div className="rec-block impact-block">
                  <span className="block-label">Expected Customer Impact</span>
                  <div className="impact-content">
                    <TrendingUp size={15} className="impact-icon" />
                    <p>{item.impact}</p>
                  </div>
                </div>

                <footer className="rec-footer">
                  <span>Frequency: <b>{item.mentions} mention{item.mentions === 1 ? "" : "s"}</b></span>
                  {item.negative_percentage > 0 && (
                    <span>Negative Ratio: <b>{item.negative_percentage}%</b></span>
                  )}
                </footer>
              </motion.article>
            ))
          ) : (
            <article className="panel empty-state">
              No recommendations found for the selected priority filter.
            </article>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
