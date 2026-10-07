import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  Flame,
  Layers,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Swords,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { api } from "../api/client";
import type { ProductComparisonData } from "../types";

export function ProductComparison({
  products,
  initialSelectedIds,
}: {
  products: any[];
  initialSelectedIds?: number[];
}) {
  const [productAId, setProductAId] = useState<number>(
    initialSelectedIds?.[0] ?? products[0]?.id ?? 1
  );
  const [productBId, setProductBId] = useState<number>(
    initialSelectedIds?.[1] ?? products[1]?.id ?? products[0]?.id ?? 1
  );
  const [comparison, setComparison] = useState<ProductComparisonData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  async function fetchComparison(idA: number, idB: number) {
    if (!idA || !idB || idA === idB) {
      setError("Please select two distinct products to perform a side-by-side comparison.");
      setComparison(null);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await api.compare([idA, idB]);
      setComparison(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate comparison analysis.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (productAId && productBId && productAId !== productBId) {
      fetchComparison(productAId, productBId);
    }
  }, [productAId, productBId]);

  if (products.length < 2) {
    return (
      <section className="panel" style={{ textAlign: "center", padding: "48px 24px", marginTop: "24px" }}>
        <Scale size={40} style={{ color: "var(--accent-mint)", margin: "0 auto 16px" }} />
        <h3 style={{ fontSize: "20px", color: "#ffffff", marginBottom: "8px" }}>Insufficient Products for Comparison</h3>
        <p style={{ color: "var(--text-secondary)", maxWidth: "520px", margin: "0 auto" }}>
          At least two products must be imported into ReviewOS to run comparative benchmarking.
        </p>
      </section>
    );
  }

  const pA = comparison?.products?.[0];
  const pB = comparison?.products?.[1];

  return (
    <div className="comparison-container">
      {/* Header */}
      <div className="section-title">
        <div>
          <p className="eyebrow"><Swords size={13} /> COMPETITIVE BENCHMARKING</p>
          <h2>Product Comparison & Intelligence Matchup</h2>
          <p>Side-by-side evidence analysis comparing AI scores, sentiment health, aspect dominance, and customer preferences.</p>
        </div>
        <Scale className="section-icon" />
      </div>

      {/* A. Product Selectors Toolbar */}
      <section className="compare-selectors-bar">
        <div className="selector-group">
          <label>Product A (Primary)</label>
          <select
            value={productAId}
            onChange={(e) => setProductAId(Number(e.target.value))}
          >
            {products.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name} ({p.review_count || 0} reviews)
              </option>
            ))}
          </select>
        </div>

        <div className="vs-badge">VS</div>

        <div className="selector-group">
          <label>Product B (Comparison Target)</label>
          <select
            value={productBId}
            onChange={(e) => setProductBId(Number(e.target.value))}
          >
            {products.map((p) => (
              <option value={p.id} key={p.id} disabled={p.id === productAId}>
                {p.name} ({p.review_count || 0} reviews)
              </option>
            ))}
          </select>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <Sparkles className="animate-spin" size={24} style={{ color: "var(--accent-mint)", margin: "0 auto 10px" }} />
          <p style={{ color: "#cbd5e1" }}>Computing cross-product intelligence matrix…</p>
        </div>
      )}

      {comparison && pA && pB && !loading && (
        <>
          {/* H. Strategic Verdict Card */}
          <section className="verdict-banner">
            <div className="verdict-icon-wrap">
              <Trophy size={24} />
            </div>
            <div>
              <span className="verdict-kicker">AI Comparative Verdict</span>
              <h3>{comparison.verdict}</h3>
            </div>
          </section>

          {/* B. Side-by-Side Overview Cards */}
          <section className="compare-cards-grid">
            {/* Product A Card */}
            <article className={`compare-card ${pA.ai_score >= pB.ai_score ? "winner" : ""}`}>
              {pA.ai_score >= pB.ai_score && <span className="winner-tag">🏆 Top Scorer</span>}
              <div className="card-top">
                <span className="cat-badge">{pA.product.category}</span>
                <span className="sku-tag">{pA.product.external_id}</span>
              </div>
              <h3 className="prod-name">{pA.product.name}</h3>

              <div className="score-hero">
                <div className="score-val">{pA.ai_score}</div>
                <div className="score-meta">
                  <span>AI Score / 100</span>
                  <small>{pA.recommendation}</small>
                </div>
              </div>

              <div className="compare-metric-row">
                <div className="c-metric">
                  <span>Star Rating</span>
                  <strong>{pA.average_rating} / 5 ★</strong>
                </div>
                <div className="c-metric">
                  <span>Satisfaction</span>
                  <strong style={{ color: "#34d399" }}>{pA.satisfaction}%</strong>
                </div>
                <div className="c-metric">
                  <span>Credibility</span>
                  <strong>{pA.credibility}%</strong>
                </div>
                <div className="c-metric">
                  <span>Reviews</span>
                  <strong>{pA.review_count}</strong>
                </div>
              </div>

              <div className="sentiment-mini-bar">
                <div className="s-seg pos" style={{ width: `${(pA.sentiments.positive / pA.review_count) * 100}%` }} />
                <div className="s-seg neu" style={{ width: `${(pA.sentiments.neutral / pA.review_count) * 100}%` }} />
                <div className="s-seg neg" style={{ width: `${(pA.sentiments.negative / pA.review_count) * 100}%` }} />
              </div>
            </article>

            {/* Product B Card */}
            <article className={`compare-card ${pB.ai_score > pA.ai_score ? "winner" : ""}`}>
              {pB.ai_score > pA.ai_score && <span className="winner-tag">🏆 Top Scorer</span>}
              <div className="card-top">
                <span className="cat-badge">{pB.product.category}</span>
                <span className="sku-tag">{pB.product.external_id}</span>
              </div>
              <h3 className="prod-name">{pB.product.name}</h3>

              <div className="score-hero">
                <div className="score-val">{pB.ai_score}</div>
                <div className="score-meta">
                  <span>AI Score / 100</span>
                  <small>{pB.recommendation}</small>
                </div>
              </div>

              <div className="compare-metric-row">
                <div className="c-metric">
                  <span>Star Rating</span>
                  <strong>{pB.average_rating} / 5 ★</strong>
                </div>
                <div className="c-metric">
                  <span>Satisfaction</span>
                  <strong style={{ color: "#34d399" }}>{pB.satisfaction}%</strong>
                </div>
                <div className="c-metric">
                  <span>Credibility</span>
                  <strong>{pB.credibility}%</strong>
                </div>
                <div className="c-metric">
                  <span>Reviews</span>
                  <strong>{pB.review_count}</strong>
                </div>
              </div>

              <div className="sentiment-mini-bar">
                <div className="s-seg pos" style={{ width: `${(pB.sentiments.positive / pB.review_count) * 100}%` }} />
                <div className="s-seg neu" style={{ width: `${(pB.sentiments.neutral / pB.review_count) * 100}%` }} />
                <div className="s-seg neg" style={{ width: `${(pB.sentiments.negative / pB.review_count) * 100}%` }} />
              </div>
            </article>
          </section>

          {/* E. STRENGTH COMPARISON: "Where Product A Wins" vs "Where Product B Wins" */}
          <section className="wins-section">
            <div className="wins-grid">
              {/* Product A Wins */}
              <div className="panel win-panel">
                <div className="win-header">
                  <Award size={18} style={{ color: "#34d399" }} />
                  <h4>Where {pA.product.name} Wins</h4>
                </div>
                <div className="win-list">
                  {comparison.strengths_comparison.pA_wins.length > 0 ? (
                    comparison.strengths_comparison.pA_wins.map((w, idx) => (
                      <div className="win-item" key={idx}>
                        <div className="win-item-top">
                          <span className="aspect-title">{w.aspect}</span>
                          <span className="delta-badge pos">+{w.delta} pts</span>
                        </div>
                        <div className="win-scores-bar">
                          <span>{pA.product.name}: <b>{w.pA_score}</b></span>
                          <span>vs</span>
                          <span>{pB.product.name}: <b>{w.pB_score}</b></span>
                        </div>
                        <p className="win-evidence">{w.evidence}</p>
                      </div>
                    ))
                  ) : (
                    <p className="empty-chart">No aspects where Product A holds a significant lead.</p>
                  )}
                </div>
              </div>

              {/* Product B Wins */}
              <div className="panel win-panel">
                <div className="win-header">
                  <Award size={18} style={{ color: "#38bdf8" }} />
                  <h4>Where {pB.product.name} Wins</h4>
                </div>
                <div className="win-list">
                  {comparison.strengths_comparison.pB_wins.length > 0 ? (
                    comparison.strengths_comparison.pB_wins.map((w, idx) => (
                      <div className="win-item" key={idx}>
                        <div className="win-item-top">
                          <span className="aspect-title">{w.aspect}</span>
                          <span className="delta-badge pos">+{w.delta} pts</span>
                        </div>
                        <div className="win-scores-bar">
                          <span>{pB.product.name}: <b>{w.pB_score}</b></span>
                          <span>vs</span>
                          <span>{pA.product.name}: <b>{w.pA_score}</b></span>
                        </div>
                        <p className="win-evidence">{w.evidence}</p>
                      </div>
                    ))
                  ) : (
                    <p className="empty-chart">No aspects where Product B holds a significant lead.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* C. Aspect Matrix Comparison */}
          {comparison.aspect_matrix.length > 0 && (
            <section className="aspect-matrix-section">
              <div className="section-title">
                <div>
                  <p className="eyebrow">HEAD-TO-HEAD MATRIX</p>
                  <h2>Aspect-by-Aspect Performance Breakdown</h2>
                </div>
              </div>

              <div className="panel aspect-matrix-table-wrap">
                <table className="aspect-matrix-table">
                  <thead>
                    <tr>
                      <th>Product Aspect</th>
                      <th>{pA.product.name}</th>
                      <th>{pB.product.name}</th>
                      <th>Advantage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.aspect_matrix.map((row) => {
                      const scoreA = row.scores[pA.product.id]?.score;
                      const scoreB = row.scores[pB.product.id]?.score;
                      const mentionsA = row.scores[pA.product.id]?.mentions ?? 0;
                      const mentionsB = row.scores[pB.product.id]?.mentions ?? 0;

                      let advantage = "Tied / Neutral";
                      if (scoreA !== null && scoreB !== null) {
                        if (scoreA > scoreB) advantage = `${pA.product.name} (+${scoreA - scoreB})`;
                        else if (scoreB > scoreA) advantage = `${pB.product.name} (+${scoreB - scoreA})`;
                      } else if (scoreA !== null) {
                        advantage = `${pA.product.name} (Exclusive evidence)`;
                      } else if (scoreB !== null) {
                        advantage = `${pB.product.name} (Exclusive evidence)`;
                      }

                      return (
                        <tr key={row.key}>
                          <td>
                            <strong>{row.name}</strong>
                          </td>
                          <td>
                            {scoreA !== null ? (
                              <div className="cell-score">
                                <span className="score-badge">{scoreA}/100</span>
                                <small>{mentionsA} mentions</small>
                              </div>
                            ) : (
                              <span className="na-text">—</span>
                            )}
                          </td>
                          <td>
                            {scoreB !== null ? (
                              <div className="cell-score">
                                <span className="score-badge">{scoreB}/100</span>
                                <small>{mentionsB} mentions</small>
                              </div>
                            ) : (
                              <span className="na-text">—</span>
                            )}
                          </td>
                          <td>
                            <span className="adv-text">{advantage}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* F. Weaknesses Comparison */}
          <section className="weakness-compare-section">
            <div className="section-title">
              <div>
                <p className="eyebrow">RISK & FRICTION BENCHMARK</p>
                <h2>Major Weaknesses Comparison</h2>
              </div>
            </div>

            <div className="wins-grid">
              <div className="panel weakness-panel">
                <h4>{pA.product.name} Vulnerabilities</h4>
                {comparison.weaknesses_comparison[pA.product.id]?.length ? (
                  comparison.weaknesses_comparison[pA.product.id].map((w, i) => (
                    <div className="weak-item" key={i}>
                      <span className="w-title">{w.aspect} ({w.score}/100)</span>
                      <p>{w.evidence}</p>
                    </div>
                  ))
                ) : (
                  <p className="empty-chart" style={{ color: "#34d399" }}>No critical weaknesses detected.</p>
                )}
              </div>

              <div className="panel weakness-panel">
                <h4>{pB.product.name} Vulnerabilities</h4>
                {comparison.weaknesses_comparison[pB.product.id]?.length ? (
                  comparison.weaknesses_comparison[pB.product.id].map((w, i) => (
                    <div className="weak-item" key={i}>
                      <span className="w-title">{w.aspect} ({w.score}/100)</span>
                      <p>{w.evidence}</p>
                    </div>
                  ))
                ) : (
                  <p className="empty-chart" style={{ color: "#34d399" }}>No critical weaknesses detected.</p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
