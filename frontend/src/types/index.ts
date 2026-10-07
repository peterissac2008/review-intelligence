export type AspectInsight = {
  key: string;
  name: string;
  mentions: number;
  score: number;
  positive: number;
  negative: number;
  neutral: number;
  explanation: string;
};

export type ProductRecommendation = {
  id: string;
  aspect: string;
  problem: string;
  evidence: string;
  recommendation: string;
  impact: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  priority_level: "critical" | "high" | "medium" | "low";
  priority_badge: string;
  mentions: number;
  negative_count: number;
  negative_percentage: number;
  aspect_score: number;
};

export type RoadmapPipelineItem = {
  id: string;
  title: string;
  problem: string;
  aspect: string;
  evidence: string;
  recommendation: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  priority_level: "critical" | "high" | "medium" | "low";
  priority_badge: string;
  impact: string;
  reason_for_priority: string;
  stage: "Immediate" | "Short Term" | "Long Term";
  stage_key: "immediate" | "short_term" | "long_term";
  stage_timeline: string;
  mentions: number;
  negative_percentage: number;
};

export type RoadmapData = {
  overview: {
    total_opportunities: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    major_category: string;
    most_important_action: string;
  };
  pipeline: RoadmapPipelineItem[];
  fix_first: {
    id: string;
    problem: string;
    aspect: string;
    why_it_matters: string;
    evidence: string;
    recommended_action: string;
    expected_impact: string;
    priority: string;
    priority_level: string;
    priority_badge: string;
    stage: string;
  }[];
};

export type CustomerVoiceTheme = {
  name: string;
  key: string;
  mentions: number;
  sentiment: "positive" | "negative" | "mixed";
  score: number;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  impact: string;
  evidence: string;
};

export type CustomerVoiceData = {
  sentiment_breakdown: {
    positive_count: number;
    neutral_count: number;
    negative_count: number;
    positive_pct: number;
    neutral_pct: number;
    negative_pct: number;
    total_reviews: number;
  };
  themes: CustomerVoiceTheme[];
  customers_love: {
    feature: string;
    positive_pct: number;
    mentions: number;
    score: number;
    evidence: string;
    why_valued: string;
  }[];
  customers_dislike: {
    problem: string;
    aspect: string;
    frequency: number;
    negative_pct: number;
    evidence: string;
    potential_impact: string;
  }[];
  priorities: {
    most_discussed_aspect: string;
    most_positive_aspect: string;
    most_negative_aspect: string;
    biggest_complaint_area: string;
    biggest_opportunity: string;
  };
  review_wall: {
    id: number;
    rating: number;
    title: string;
    text: string;
    sentiment: string;
    emotion: string;
    credibility: number;
    keywords: string[];
    date?: string;
  }[];
};

export type SmartInsight = {
  id: string;
  title: string;
  type: "Major Strength" | "Major Weakness" | "Recurring Complaint" | "Satisfaction Driver" | "Quality Concern" | "Rating Mismatch";
  explanation: string;
  supporting_metric: string;
  evidence: string;
  impact_level: "Critical Alert" | "High Impact" | "Medium Impact" | "Positive Anchor";
  priority: "Critical" | "High" | "Medium" | "Low";
  why_it_matters: string;
};

export type SmartInsightsData = {
  insights: SmartInsight[];
  key_takeaways: {
    what_is_working: string[];
    what_is_failing: string[];
    what_customers_care_about: string[];
    what_should_be_improved: string[];
  };
};

export type ReviewItem = {
  id: number;
  rating: number;
  title?: string | null;
  text: string;
  date?: string;
  author?: string;
  analysis?: {
    sentiment: "positive" | "neutral" | "negative";
    sentiment_score?: number;
    predicted_rating?: number;
    sentiment_intensity?: number;
    emotion?: string;
    confidence?: number;
    credibility?: number;
    aspects?: { name: string; sentiment: string; confidence: number }[];
    keywords?: string[];
    explanation?: string;
  };
};

export type SingleReviewPrediction = {
  text: string;
  rating?: number | null;
  sentiment: "positive" | "neutral" | "negative";
  sentiment_score: number;
  sentiment_intensity: number;
  predicted_rating: number;
  emotion: string;
  confidence: number;
  credibility: number;
  quality: number;
  suspicious_probability: number;
  aspects: { name: string; sentiment: string; confidence: number }[];
  keywords: string[];
  explanation: string;
};

export type OverallDatasetStats = {
  total_reviews: number;
  total_products: number;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
    positive_pct: number;
    neutral_pct: number;
    negative_pct: number;
  };
  average_actual_rating: number;
  average_predicted_rating: number;
  average_sentiment_score: number;
  average_credibility: number;
  rating_distribution: { rating: string; count: number; pct: number }[];
  predicted_rating_distribution: { rating: string; count: number; pct: number }[];
  accuracy: {
    exact_match_pct: number;
    within_one_star_pct: number;
    mae: number;
  };
  top_aspects: { name: string; mentions: number; positive: number; negative: number }[];
  top_keywords: string[];
};

export type Analytics = {
  product: { id: number; name: string; external_id: string; category: string };
  review_count: number;
  average_rating: number;
  average_predicted_rating?: number;
  average_sentiment_score?: number;
  prediction_accuracy?: { exact_matches_pct: number; within_one_star_pct: number; mae: number };
  ai_score: number;
  satisfaction: number;
  credibility: number;
  avg_confidence?: number;
  credibility_distribution?: { name: string; value: number; percentage: number }[];
  recommendation: string;
  verdict: string;
  score_explanation: string;
  sentiments: Record<"positive" | "neutral" | "negative", number>;
  sentiment_comparison: { name: string; value: number }[];
  rating_distribution: { rating: string; count: number }[];
  review_trend: { period: string; reviews: number }[];
  emotions: Record<string, number>;
  aspects: AspectInsight[];
  aspect_insights: AspectInsight[];
  strengths: AspectInsight[];
  weaknesses: AspectInsight[];
  recommendations: ProductRecommendation[];
  product_improvements?: ProductRecommendation[];
  roadmap?: RoadmapData;
  customer_voice?: CustomerVoiceData;
  smart_insights?: SmartInsightsData;
};

export type ProductComparisonData = {
  status: "success" | "insufficient_data";
  message?: string;
  products: Analytics[];
  aspect_matrix: {
    key: string;
    name: string;
    scores: Record<number, { score: number | null; mentions: number; positive: number; negative: number }>;
  }[];
  strengths_comparison: {
    pA_wins: { aspect: string; pA_score: number; pB_score: number; delta: number; evidence: string }[];
    pB_wins: { aspect: string; pA_score: number; pB_score: number; delta: number; evidence: string }[];
  };
  weaknesses_comparison: Record<string, { aspect: string; score: number; negative_pct: number; evidence: string }[]>;
  verdict: string;
};

export type AssistantResponse = {
  answer: string;
  sources: string[];
  suggested_actions: string[];
  suggested_questions: string[];
  navigate_to_tab: string | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: string[];
  suggested_actions?: string[];
  suggested_questions?: string[];
  navigate_to_tab?: string | null;
};


