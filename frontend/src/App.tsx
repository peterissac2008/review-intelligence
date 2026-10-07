import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Compass,
  Layers,
  Lightbulb,
  MessageSquare,
  Milestone,
  Package,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Swords,
  Tag,
  TrendingUp,
  Users,
  Volume2,
} from "lucide-react";
import { api } from "./api/client";
import type { Analytics, AspectInsight } from "./types";
import { MetricCard } from "./components/MetricCard";
import { Upload } from "./components/Upload";
import { CredibilityAccuracyChart, RatingChart, SentimentChart, SentimentComparisonChart, TrendChart } from "./components/Charts";
import { ProductImprovements } from "./components/ProductImprovements";
import { Roadmap } from "./components/Roadmap";
import { CustomerVoice } from "./components/CustomerVoice";
import { SmartInsights } from "./components/SmartInsights";
import { ProductComparison } from "./components/ProductComparison";
import { ReviewList } from "./components/ReviewList";

type NavTab = "overview" | "roadmap" | "voice" | "insights" | "compare" | "reviews";

function ScoreGauge({ score, recommendation }: { score: number; recommendation: string }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (s: number) => {
    if (s >= 75) return "#10b981";
    if (s >= 55) return "#f59e0b";
    return "#ef4444";
  };

  const strokeColor = getScoreColor(score);

  return (
    <div className="score-widget">
      <span className="score-widget-label">Executive AI Score</span>
      <div className="gauge-wrap">
        <svg className="gauge-svg" viewBox="0 0 140 140">
          <circle className="gauge-bg" cx="70" cy="70" r={radius} />
          <circle
            className="gauge-fill"
            cx="70"
            cy="70"
            r={radius}
            stroke={strokeColor}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="gauge-center-text">
          <span className="gauge-number" style={{ color: strokeColor }}>{score}</span>
          <span className="gauge-unit">/ 100</span>
        </div>
      </div>
      <span className="score-widget-sub">Evidence-grounded diagnosis</span>
    </div>
  );
}

function AspectCard({
  aspect,
  isSelected,
  onSelect,
}: {
  aspect: AspectInsight;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`aspect-card ${isSelected ? "selected" : ""}`}
      onClick={onSelect}
      title="Click to filter review evidence by this aspect"
    >
      <div>
        <div className="aspect-heading">
          <div>
            <h4>{aspect.name}</h4>
            <span>{aspect.mentions} evidence-backed mention{aspect.mentions === 1 ? "" : "s"}</span>
          </div>
          <div className="aspect-score-badge">
            {aspect.score}<small>/100</small>
          </div>
        </div>
        <div className="signal-bar">
          <i className="positive-bar" style={{ width: `${aspect.positive}%` }} title={`Positive: ${aspect.positive}%`} />
          <i className="neutral-bar" style={{ width: `${aspect.neutral}%` }} title={`Neutral: ${aspect.neutral}%`} />
          <i className="negative-bar" style={{ width: `${aspect.negative}%` }} title={`Negative: ${aspect.negative}%`} />
        </div>
        <div className="aspect-stat">
          <span>Positive <b>{aspect.positive}%</b></span>
          <span>Negative <b>{aspect.negative}%</b></span>
        </div>
      </div>
      <p>{aspect.explanation}</p>
    </article>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [products, setProducts] = useState<any[]>([]);
  const [id, setId] = useState<number>();
  const [data, setData] = useState<Analytics>();
  const [reviews, setReviews] = useState<any[]>([]);
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadDashboard(productId?: number) {
    setError("");
    setLoading(true);
    try {
      const availableProducts = await api.products();
      if (!availableProducts.length) {
        throw new Error("No analyzed product reviews found in database.");
      }
      const selectedId = productId ?? id ?? availableProducts[0].id;
      const [analytics, loadedReviews] = await Promise.all([
        api.analytics(selectedId),
        api.reviews(selectedId),
      ]);
      setProducts(availableProducts);
      setId(selectedId);
      setData(analytics as Analytics);
      setReviews(loadedReviews as any[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load product intelligence.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const changeProduct = async (productId: number) => {
    setSelectedAspect(null);
    await loadDashboard(productId);
  };

  if (!data && !loading) {
    return (
      <main className="landing">
        <div className="orb one" />
        <div className="orb two" />
        <div className="orb three" />
        <div className="landing-badge">
          <Sparkles size={14} /> ReviewOS · Next-Gen Intelligence
        </div>
        <h1>
          Turn customer reviews into <span>decisive product action.</span>
        </h1>
        <p>
          Instant NLP sentiment heuristics, aspect-level intelligence, credibility auditing, and prioritized product roadmaps.
        </p>
        {error && <p role="alert" className="error-banner">{error}</p>}
        <Upload onComplete={loadDashboard} />
      </main>
    );
  }

  const isRecHigh = data ? data.ai_score >= 75 : false;
  const isRecMed = data ? data.ai_score >= 55 && data.ai_score < 75 : false;

  return (
    <main>
      <div className="orb one" />
      <div className="orb two" />
      <div className="orb three" />

      {/* Top Header */}
      <header>
        <div className="brand">
          <div className="brand-icon-wrap">
            <Sparkles size={19} />
          </div>
          <div>ReviewOS</div>
          <span>
            <i className="status-dot" /> AI Engine Active
          </span>
        </div>

        <div className="header-actions">
          <div className="product-select-wrapper">
            <select
              aria-label="Select product"
              value={id}
              onChange={(event) => changeProduct(Number(event.target.value))}
            >
              {products.map((product) => (
                <option value={product.id} key={product.id}>
                  {product.name} ({product.review_count || 0} reviews)
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="select-arrow" />
          </div>
          <Upload onComplete={loadDashboard} />
        </div>
      </header>

      {/* Futuristic Global Navigation Tabs */}
      <nav className="global-nav" aria-label="ReviewOS Layers Navigation">
        <button
          type="button"
          className={`nav-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <BarChart3 size={15} /> Overview & Analytics
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === "roadmap" ? "active" : ""}`}
          onClick={() => setActiveTab("roadmap")}
        >
          <Milestone size={15} /> Improvement Roadmap
          {data?.roadmap?.overview.total_opportunities ? (
            <span className="nav-tab-badge">{data.roadmap.overview.total_opportunities}</span>
          ) : null}
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === "voice" ? "active" : ""}`}
          onClick={() => setActiveTab("voice")}
        >
          <Volume2 size={15} /> Customer Voice
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === "insights" ? "active" : ""}`}
          onClick={() => setActiveTab("insights")}
        >
          <Lightbulb size={15} /> Smart Key Insights
          {data?.smart_insights?.insights.length ? (
            <span className="nav-tab-badge">{data.smart_insights.insights.length}</span>
          ) : null}
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === "compare" ? "active" : ""}`}
          onClick={() => setActiveTab("compare")}
        >
          <Swords size={15} /> Product Comparison
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          <ShieldCheck size={15} /> Review Evidence ({reviews.length})
        </button>
      </nav>

      {error && <p role="alert" className="error-banner">{error}</p>}

      {data && (
        <>
          {/* TAB 1: EXECUTIVE OVERVIEW & ANALYTICS */}
          {activeTab === "overview" && (
            <div>
              {/* Executive Hero */}
              <section className="hero-executive">
                <div className="hero-content">
                  <p className="eyebrow">
                    <Layers size={13} /> Executive Product Intelligence
                  </p>
                  <h1>{data.product.name}</h1>

                  <div className="product-meta">
                    <span className="meta-tag highlight">
                      <Tag size={13} /> {data.product.category}
                    </span>
                    <span className="meta-tag">
                      <Package size={13} /> ASIN/SKU: {data.product.external_id}
                    </span>
                    <span className="meta-tag">
                      <Users size={13} /> {data.review_count.toLocaleString()} Verified Reviews
                    </span>
                  </div>

                  <p className="hero-description">{data.score_explanation}</p>

                  <div className={`recommendation-banner ${isRecHigh ? "" : isRecMed ? "warning" : "danger"}`}>
                    {isRecHigh ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{data.recommendation}</span>
                  </div>
                </div>

                <ScoreGauge score={data.ai_score} recommendation={data.recommendation} />
              </section>

              {/* Metric Cards Grid */}
              <section className="metrics-grid">
                <MetricCard
                  label="Star Rating Average"
                  value={`${data.average_rating} / 5`}
                  detail={data.average_predicted_rating ? `AI Estimated avg: ★ ${data.average_predicted_rating} / 5` : "Calculated across all customer reviews"}
                  icon={<Star size={18} style={{ color: "#fbbf24" }} />}
                />
                <MetricCard
                  label="AI Sentiment Score"
                  value={data.average_sentiment_score !== undefined ? `${data.average_sentiment_score >= 0 ? "+" : ""}${data.average_sentiment_score.toFixed(2)}` : `${data.satisfaction}%`}
                  detail={`${data.satisfaction}% positive sentiment ratio`}
                  icon={<Activity size={18} style={{ color: "#10b981" }} />}
                />
                <MetricCard
                  label="Review Credibility"
                  value={`${data.credibility}%`}
                  detail="Anomaly, duplicate & length audit"
                  icon={<ShieldCheck size={18} style={{ color: "#06b6d4" }} />}
                />
                <MetricCard
                  label="Rating Accuracy"
                  value={data.prediction_accuracy ? `${data.prediction_accuracy.within_one_star_pct}%` : data.recommendation.replace("Recommended ", "")}
                  detail={data.prediction_accuracy ? `MAE: ${data.prediction_accuracy.mae} · ${data.prediction_accuracy.exact_matches_pct}% exact match` : "AI decision confidence score"}
                  icon={<Sparkles size={18} style={{ color: "#8b5cf6" }} />}
                />
              </section>

              {/* Sentiment Analytics Section */}
              <div className="section-title">
                <div>
                  <p className="eyebrow">NEURAL SENTIMENT & MOMENTUM</p>
                  <h2>Customer Sentiment & Volume Analytics</h2>
                  <p>Real-time aggregation of sentiment distribution, star ratings, and review timeline trajectory.</p>
                </div>
                <Activity className="section-icon" />
              </div>
              <section className="chart-grid">
                <SentimentChart data={data} />
                <CredibilityAccuracyChart data={data} />
                <RatingChart data={data} />
                <SentimentComparisonChart data={data} />
                <TrendChart data={data} />
              </section>

              {/* Product Aspect Intelligence Grid */}
              <div className="section-title">
                <div>
                  <p className="eyebrow">MULTI-DIMENSIONAL ASPECT DIAGNOSIS</p>
                  <h2>Product Quality & Feature Breakdown</h2>
                  <p>Calculated strictly from reviews where specific product aspects are explicitly discussed. Click any card to filter reviews.</p>
                </div>
                <TrendingUp className="section-icon" />
              </div>
              <section className="aspect-grid">
                {data.aspect_insights.length ? (
                  data.aspect_insights.map((aspect) => (
                    <AspectCard
                      key={aspect.key}
                      aspect={aspect}
                      isSelected={selectedAspect === aspect.name}
                      onSelect={() => {
                        setSelectedAspect(selectedAspect === aspect.name ? null : aspect.name);
                        setActiveTab("reviews");
                      }}
                    />
                  ))
                ) : (
                  <article className="panel empty-state">
                    No product aspects were explicitly detected in these reviews yet.
                  </article>
                )}
              </section>

              {/* Product Improvement Recommendations Preview */}
              <ProductImprovements recommendations={data.recommendations || []} />
            </div>
          )}

          {/* TAB 2: PRODUCT IMPROVEMENT ROADMAP (LAYER 3) */}
          {activeTab === "roadmap" && (
            <Roadmap roadmap={data.roadmap} />
          )}

          {/* TAB 3: CUSTOMER VOICE / REVIEW INTELLIGENCE (LAYER 4) */}
          {activeTab === "voice" && (
            <CustomerVoice customerVoice={data.customer_voice} />
          )}

          {/* TAB 4: SMART KEY INSIGHTS (LAYER 5) */}
          {activeTab === "insights" && (
            <SmartInsights smartInsights={data.smart_insights} />
          )}

          {/* TAB 5: PRODUCT COMPARISON (LAYER 6) */}
          {activeTab === "compare" && (
            <ProductComparison
              products={products}
              initialSelectedIds={[id ?? products[0]?.id ?? 1, products[1]?.id ?? products[0]?.id ?? 1]}
            />
          )}

          {/* TAB 6: REVIEW EVIDENCE EXPLORER */}
          {activeTab === "reviews" && (
            <div>
              <div className="section-title">
                <div>
                  <p className="eyebrow">VERIFIED REVIEW EVIDENCE</p>
                  <h2>Source-Level Review Explorer</h2>
                  <p>Inspect raw review text, sentiment classification, emotion tags, and credibility anomaly scores.</p>
                </div>
                <ShieldCheck className="section-icon" />
              </div>
              <ReviewList
                reviews={reviews}
                activeAspectFilter={selectedAspect}
                onClearAspectFilter={() => setSelectedAspect(null)}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}
