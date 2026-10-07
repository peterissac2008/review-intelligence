import { useState } from "react";
import { CheckCircle2, ChevronRight, HelpCircle, Loader2, Play, Search, Shield, Sparkles, Star, User, X } from "lucide-react";
import { api } from "../api/client";
import type { ReviewItem, SingleReviewPrediction } from "../types";

interface ReviewListProps {
  reviews: ReviewItem[];
  activeAspectFilter?: string | null;
  onClearAspectFilter?: () => void;
}

export function ReviewList({ reviews, activeAspectFilter, onClearAspectFilter }: ReviewListProps) {
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  // Live AI Review Predictor State
  const [inputText, setInputText] = useState("");
  const [inputRating, setInputRating] = useState<string>("");
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState<SingleReviewPrediction | null>(null);
  const [predictError, setPredictError] = useState("");

  const samplePrompts = [
    { label: "Positive Fresh Review", text: "Excellent fresh taste! The ingredients are top quality and delivery was super fast. Absolutely delicious, will definitely buy again.", rating: 5 },
    { label: "Damaged Package Complaint", text: "Box was completely crushed and arrived broken with stale contents. Very disappointing quality and slow response from seller.", rating: 1 },
    { label: "Balanced / Neutral Feedback", text: "Product is okay. The design and usability are decent, but price is slightly high for the small portion size.", rating: 3 }
  ];

  async function handlePredict(customText?: string, customRating?: number) {
    const textToAnalyze = customText !== undefined ? customText : inputText;
    const ratingToUse = customRating !== undefined ? customRating : (inputRating ? Number(inputRating) : null);
    
    if (!textToAnalyze.trim()) {
      setPredictError("Please enter a customer review text to predict.");
      return;
    }
    setPredictError("");
    setPredictLoading(true);
    try {
      const res = await api.analyzeReview(textToAnalyze, ratingToUse);
      setPredictionResult(res as SingleReviewPrediction);
    } catch (err) {
      setPredictError(err instanceof Error ? err.message : "Failed to analyze review.");
    } finally {
      setPredictLoading(false);
    }
  }

  const filtered = reviews.filter((r) => {
    // Sentiment filter
    if (sentimentFilter !== "all" && r.analysis?.sentiment !== sentimentFilter) {
      return false;
    }
    // Rating filter
    if (ratingFilter !== "all" && Math.round(r.rating) !== Number(ratingFilter)) {
      return false;
    }
    // Aspect filter
    if (activeAspectFilter) {
      const aspects = r.analysis?.aspects || [];
      const hasAspect = aspects.some((a: any) => (a.name || a.key || "").toLowerCase() === activeAspectFilter.toLowerCase());
      if (!hasAspect) return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (r.title || "").toLowerCase().includes(q);
      const textMatch = (r.text || "").toLowerCase().includes(q);
      const authorMatch = (r.author || "").toLowerCase().includes(q);
      if (!titleMatch && !textMatch && !authorMatch) return false;
    }
    return true;
  });

  return (
    <section className="reviews-container">
      {/* Interactive Live Review Rating Predictor */}
      <div className="live-predictor-card">
        <div className="predictor-header">
          <div className="predictor-badge">
            <Sparkles size={14} /> AI Review Rating Engine
          </div>
          <h3>Live AI Review Tester & Rating Predictor</h3>
          <p>
            Test any customer review text to instantly extract sentiment, AI sentiment score, estimated star rating, and evidence reason.
          </p>
        </div>

        <div className="predictor-samples">
          <span className="samples-label">Quick test examples:</span>
          {samplePrompts.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              className="sample-pill-btn"
              onClick={() => {
                setInputText(sample.text);
                setInputRating(String(sample.rating));
                handlePredict(sample.text, sample.rating);
              }}
            >
              {sample.label}
            </button>
          ))}
        </div>

        <div className="predictor-input-grid">
          <div style={{ flex: 1 }}>
            <textarea
              className="predictor-textarea"
              rows={3}
              placeholder="Paste or type a customer review here (e.g. 'Loved the flavor and packaging was great...')"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>
          <div className="predictor-actions-col">
            <select
              className="predictor-select"
              aria-label="Optional given rating"
              value={inputRating}
              onChange={(e) => setInputRating(e.target.value)}
            >
              <option value="">No Given Rating (Pure Text Prediction)</option>
              <option value="5">5 Stars ★★★★★</option>
              <option value="4">4 Stars ★★★★☆</option>
              <option value="3">3 Stars ★★★☆☆</option>
              <option value="2">2 Stars ★★☆☆☆</option>
              <option value="1">1 Star ★☆☆☆☆</option>
            </select>
            <button
              type="button"
              className="predict-submit-btn"
              disabled={predictLoading || !inputText.trim()}
              onClick={() => handlePredict()}
            >
              {predictLoading ? (
                <>
                  <Loader2 size={16} className="spin" /> Predicting...
                </>
              ) : (
                <>
                  <Play size={16} /> Run Prediction
                </>
              )}
            </button>
          </div>
        </div>

        {predictError && <p role="alert" className="error-banner" style={{ marginTop: "12px" }}>{predictError}</p>}

        {predictionResult && (
          <div className="prediction-result-panel">
            <div className="res-top-grid">
              <div className="res-stat-box">
                <span className="res-label">1. Sentiment</span>
                <span className={`badge ${predictionResult.sentiment}`} style={{ fontSize: "13px", marginTop: "4px" }}>
                  {predictionResult.sentiment.toUpperCase()}
                </span>
              </div>
              <div className="res-stat-box">
                <span className="res-label">2. Sentiment Score</span>
                <span className="res-value" style={{ color: predictionResult.sentiment_score >= 0 ? "#34d399" : "#f87171" }}>
                  {predictionResult.sentiment_score >= 0 ? `+${predictionResult.sentiment_score.toFixed(2)}` : predictionResult.sentiment_score.toFixed(2)}
                </span>
              </div>
              <div className="res-stat-box highlight">
                <span className="res-label">3. Predicted Rating</span>
                <span className="res-value star-val">
                  ★ {predictionResult.predicted_rating.toFixed(1)} <small>/ 5.0</small>
                </span>
              </div>
              <div className="res-stat-box">
                <span className="res-label">AI Confidence / Emotion</span>
                <span className="res-value" style={{ fontSize: "14px", textTransform: "capitalize" }}>
                  {predictionResult.confidence}% · {predictionResult.emotion}
                </span>
              </div>
            </div>

            <div className="res-explanation-box">
              <span className="expl-tag"><Sparkles size={13} /> 4. AI Explanation & Reasoning</span>
              <p>{predictionResult.explanation}</p>
            </div>

            {predictionResult.aspects && predictionResult.aspects.length > 0 && (
              <div className="res-aspects-row">
                <span className="aspects-inline-label">Detected Aspects:</span>
                {predictionResult.aspects.map((asp, idx) => (
                  <span key={idx} className={`aspect-tag-pill ${asp.sentiment}`}>
                    {asp.name} ({asp.confidence}% conf)
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="review-controls">
        <div className="sentiment-filter-tabs">
          <button
            type="button"
            className={`tab-btn ${sentimentFilter === "all" ? "active" : ""}`}
            onClick={() => setSentimentFilter("all")}
          >
            All ({reviews.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${sentimentFilter === "positive" ? "active" : ""}`}
            onClick={() => setSentimentFilter("positive")}
          >
            🟢 Positive
          </button>
          <button
            type="button"
            className={`tab-btn ${sentimentFilter === "neutral" ? "active" : ""}`}
            onClick={() => setSentimentFilter("neutral")}
          >
            ⚪ Neutral
          </button>
          <button
            type="button"
            className={`tab-btn ${sentimentFilter === "negative" ? "active" : ""}`}
            onClick={() => setSentimentFilter("negative")}
          >
            🔴 Negative
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            aria-label="Filter by star rating"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#f1f5f9",
              padding: "7px 10px",
              borderRadius: "8px",
              fontSize: "12.5px",
            }}
          >
            <option value="all">All Stars</option>
            <option value="5">5 Stars ★★★★★</option>
            <option value="4">4 Stars ★★★★☆</option>
            <option value="3">3 Stars ★★★☆☆</option>
            <option value="2">2 Stars ★★☆☆☆</option>
            <option value="1">1 Star ★☆☆☆☆</option>
          </select>

          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search in reviews…"
              className="review-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {activeAspectFilter && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
          padding: "8px 14px",
          background: "rgba(16, 185, 129, 0.12)",
          border: "1px solid rgba(52, 211, 153, 0.35)",
          borderRadius: "10px",
          color: "#6ee7b7",
          fontSize: "13px",
        }}>
          <span>Filtered by aspect: <b>{activeAspectFilter}</b></span>
          <button
            type="button"
            onClick={onClearAspectFilter}
            style={{
              background: "transparent",
              border: "none",
              color: "#a7f3d0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              marginLeft: "auto",
            }}
          >
            <X size={16} /> Clear filter
          </button>
        </div>
      )}

      {/* Review Cards List */}
      {filtered.length > 0 ? (
        filtered.map((review) => {
          const predRating = review.analysis?.predicted_rating ?? review.rating;
          const sentScore = review.analysis?.sentiment_score;

          return (
            <article className="review-card" key={review.id}>
              <div className="review-top">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span className="review-stars" title={`Actual Rating: ${review.rating} stars`}>
                    {"★".repeat(Math.round(review.rating))}
                    <span style={{ opacity: 0.3 }}>{"★".repeat(5 - Math.round(review.rating))}</span>
                  </span>

                  <span className="predicted-rating-pill" title="AI Predicted Rating">
                    <Sparkles size={11} /> Pred: ★ {predRating.toFixed(1)}
                  </span>

                  <span className={`badge ${review.analysis?.sentiment || "neutral"}`}>
                    {review.analysis?.sentiment || "neutral"}
                  </span>

                  {sentScore !== undefined && (
                    <span className="sentiment-score-pill" title="AI Sentiment Polarity Score">
                      Score: {sentScore >= 0 ? `+${sentScore.toFixed(2)}` : sentScore.toFixed(2)}
                    </span>
                  )}

                  {review.analysis?.emotion && (
                    <span className="badge neutral">
                      {review.analysis.emotion}
                    </span>
                  )}
                </div>
                {review.date && (
                  <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                    {new Date(review.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
              </div>

              <h4 className="review-title">{review.title || "Customer Review"}</h4>
              <p className="review-text">{review.text}</p>

              {/* AI Prediction Explanation Box */}
              {review.analysis?.explanation && (
                <div className="review-explanation-callout">
                  <div className="explanation-kicker">
                    <Sparkles size={12} style={{ color: "#34d399" }} /> AI Prediction Reason:
                  </div>
                  <p>{review.analysis.explanation}</p>
                </div>
              )}

              <footer className="review-footer">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Shield size={13} style={{ color: "#34d399" }} />
                  Credibility: <b>{review.analysis?.credibility ?? 90}%</b>
                </span>
                <span>
                  Confidence: <b>{review.analysis?.confidence ?? 85}%</b>
                </span>
                {review.analysis?.keywords && review.analysis.keywords.length > 0 && (
                  <div style={{ display: "inline-flex", flexWrap: "wrap", gap: "5px", marginLeft: "auto" }}>
                    {review.analysis.keywords.slice(0, 4).map((kw: string, i: number) => (
                      <span key={i} className="keyword-tag">#{kw}</span>
                    ))}
                  </div>
                )}
              </footer>
            </article>
          );
        })
      ) : (
        <article className="panel empty-state">
          No review evidence matches the selected filters.
        </article>
      )}
    </section>
  );
}

