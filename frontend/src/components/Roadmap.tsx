import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Flame,
  Layers,
  Milestone,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import type { RoadmapData } from "../types";

export function Roadmap({ roadmap }: { roadmap?: RoadmapData }) {
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!roadmap || !roadmap.pipeline || roadmap.pipeline.length === 0) {
    return (
      <section className="panel" style={{ textAlign: "center", padding: "48px 24px", marginTop: "24px" }}>
        <Compass size={40} style={{ color: "var(--accent-mint)", margin: "0 auto 16px" }} />
        <h3 style={{ fontSize: "20px", color: "#ffffff", marginBottom: "8px" }}>Insufficient Data for Roadmap Generation</h3>
        <p style={{ color: "var(--text-secondary)", maxWidth: "520px", margin: "0 auto" }}>
          More review data with detected aspect complaints is required to construct a multi-phase development roadmap.
        </p>
      </section>
    );
  }

  const { overview, pipeline, fix_first } = roadmap;

  const filteredPipeline = selectedStage === "all"
    ? pipeline
    : pipeline.filter((item) => item.stage_key === selectedStage);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStageIcon = (stageKey: string) => {
    switch (stageKey) {
      case "immediate": return <Flame size={16} style={{ color: "#ef4444" }} />;
      case "short_term": return <Clock size={16} style={{ color: "#f59e0b" }} />;
      default: return <Milestone size={16} style={{ color: "#10b981" }} />;
    }
  };

  return (
    <div className="roadmap-container">
      {/* Header */}
      <div className="section-title">
        <div>
          <p className="eyebrow"><Milestone size={13} /> ACTIONABLE DEVELOPMENT ROADMAP</p>
          <h2>Product Improvement Roadmap</h2>
          <p>Converting customer complaints and verified weaknesses into an evidence-backed implementation timeline.</p>
        </div>
        <Compass className="section-icon" />
      </div>

      {/* A. Roadmap Overview */}
      <section className="roadmap-overview-grid">
        <div className="roadmap-stat-card primary">
          <div className="stat-card-header">
            <span>Total Opportunities</span>
            <Sparkles size={16} style={{ color: "var(--accent-mint)" }} />
          </div>
          <div className="stat-number">{overview.total_opportunities}</div>
          <div className="priority-pills-row">
            <span className="p-pill critical">🔴 {overview.critical_count} Critical</span>
            <span className="p-pill high">🟠 {overview.high_count} High</span>
            <span className="p-pill medium">🟡 {overview.medium_count} Med</span>
            <span className="p-pill low">🟢 {overview.low_count} Low</span>
          </div>
        </div>

        <div className="roadmap-stat-card">
          <div className="stat-card-header">
            <span>Primary Focus Domain</span>
            <Layers size={16} style={{ color: "#38bdf8" }} />
          </div>
          <div className="stat-value-text">{overview.major_category}</div>
          <div className="stat-sub">Highest density of customer improvement feedback</div>
        </div>

        <div className="roadmap-stat-card highlight">
          <div className="stat-card-header">
            <span>Priority #1 Action</span>
            <Zap size={16} style={{ color: "#fbbf24" }} />
          </div>
          <div className="stat-action-text">{overview.most_important_action}</div>
          <div className="stat-sub">Recommended immediate engineering / supply-chain fix</div>
        </div>
      </section>

      {/* E. "WHAT SHOULD WE FIX FIRST?" */}
      {fix_first && fix_first.length > 0 && (
        <section className="fix-first-section">
          <div className="fix-first-header">
            <div className="glow-badge">
              <Flame size={14} /> Critical Action Items
            </div>
            <h3>What Should We Fix First?</h3>
            <p>Highest-impact solutions addressing the most damaging customer complaint vectors.</p>
          </div>

          <div className="fix-first-grid">
            {fix_first.map((item, idx) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.08 }}
                className={`fix-first-card ${item.priority_level}`}
              >
                <div className="fix-first-top">
                  <div className="rank-badge">#{idx + 1}</div>
                  <span className={`priority-badge ${item.priority_level}`}>
                    {item.priority_badge}
                  </span>
                  <span className="stage-pill">{item.stage}</span>
                </div>

                <h4 className="fix-title">{item.problem}</h4>

                <div className="fix-block why-block">
                  <span className="block-label">Why It Matters</span>
                  <p>{item.why_it_matters}</p>
                </div>

                <div className="fix-block evidence-block">
                  <span className="block-label">Customer Evidence</span>
                  <p className="evidence-text">{item.evidence}</p>
                </div>

                <div className="fix-block action-block">
                  <span className="block-label">Recommended Action</span>
                  <div className="action-content">
                    <Wrench size={15} className="action-icon" />
                    <p>{item.recommended_action}</p>
                  </div>
                </div>

                <div className="fix-impact-footer">
                  <TrendingUp size={14} style={{ color: "#34d399" }} />
                  <span>Expected Impact: <b>{item.expected_impact}</b></span>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      {/* D. Roadmap Visualization & Pipeline Stages */}
      <div className="section-title" style={{ marginTop: "40px" }}>
        <div>
          <p className="eyebrow">PHASED EXECUTION</p>
          <h2>Implementation Timeline & Pipeline</h2>
          <p>Organized by operational complexity, dependency hierarchy, and urgency.</p>
        </div>
        <div className="stage-filters">
          <button
            type="button"
            className={`filter-chip ${selectedStage === "all" ? "active" : ""}`}
            onClick={() => setSelectedStage("all")}
          >
            All Phases ({pipeline.length})
          </button>
          <button
            type="button"
            className={`filter-chip critical ${selectedStage === "immediate" ? "active" : ""}`}
            onClick={() => setSelectedStage("immediate")}
          >
            🔴 Immediate (Now)
          </button>
          <button
            type="button"
            className={`filter-chip high ${selectedStage === "short_term" ? "active" : ""}`}
            onClick={() => setSelectedStage("short_term")}
          >
            🟠 Short Term (Next)
          </button>
          <button
            type="button"
            className={`filter-chip low ${selectedStage === "long_term" ? "active" : ""}`}
            onClick={() => setSelectedStage("long_term")}
          >
            🟢 Long Term (Future)
          </button>
        </div>
      </div>

      <div className="timeline-pipeline">
        <AnimatePresence mode="popLayout">
          {filteredPipeline.map((item, index) => {
            const isExpanded = expandedId === item.id;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                className={`timeline-item ${item.stage_key} ${item.priority_level}`}
              >
                <div className="timeline-node">
                  {getStageIcon(item.stage_key)}
                </div>

                <div className="timeline-content-card">
                  <div className="timeline-header" onClick={() => toggleExpand(item.id)}>
                    <div className="timeline-header-left">
                      <span className="stage-badge">{item.stage_timeline}</span>
                      <span className="aspect-tag">{item.aspect}</span>
                      <h4 className="item-title">{item.title}</h4>
                    </div>

                    <div className="timeline-header-right">
                      <span className={`priority-badge ${item.priority_level}`}>
                        {item.priority_badge}
                      </span>
                      <button type="button" className="expand-btn">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="timeline-summary-row">
                    <div className="summary-col">
                      <span className="col-label">Recommended Action</span>
                      <p>{item.recommendation}</p>
                    </div>
                    <div className="summary-col">
                      <span className="col-label">Projected Outcome</span>
                      <p>{item.impact}</p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="timeline-expanded-details"
                      >
                        <div className="rec-block evidence-block" style={{ marginTop: "12px" }}>
                          <span className="block-label">Verified Customer Review Evidence</span>
                          <p className="evidence-text">{item.evidence}</p>
                        </div>
                        <div className="rec-block" style={{ marginTop: "8px" }}>
                          <span className="block-label">Priority Rationale</span>
                          <p style={{ fontSize: "13px", color: "#cbd5e1", margin: 0 }}>{item.reason_for_priority}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
