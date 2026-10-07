import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Analytics } from "../types";

const SENTIMENT_COLORS = ["#10b981", "#64748b", "#f43f5e"];
const CREDIBILITY_COLORS = ["#10b981", "#f59e0b", "#ef4444"];
const axisStyle = { fill: "#94a3b8", fontSize: 11, fontFamily: "Plus Jakarta Sans" };

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "rgba(10, 18, 34, 0.94)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "10px",
        padding: "8px 14px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        color: "#ffffff",
        fontSize: "12px",
      }}>
        <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: "3px" }}>{label || payload[0].name}</div>
        <div style={{ color: "#34d399", fontWeight: 700, fontSize: "14px" }}>
          {payload[0].value.toLocaleString()} <span style={{ fontSize: "11px", fontWeight: 400, color: "#cbd5e1" }}>reviews</span>
        </div>
      </div>
    );
  }
  return null;
}

export function SentimentChart({ data }: { data: Analytics }) {
  const chartData = Object.entries(data.sentiments).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));
  const total = data.review_count || 1;

  return (
    <section className="panel chart-panel">
      <div className="section-kicker">Voice of Customer</div>
      <h3>Sentiment Distribution Pie Chart</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={88}
            paddingAngle={4}
            stroke="none"
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={SENTIMENT_COLORS[index]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        {chartData.map((item, index) => (
          <span key={item.name}>
            <i style={{ background: SENTIMENT_COLORS[index] }} />
            {item.name} <b>{item.value} ({Math.round((item.value / total) * 100)}%)</b>
          </span>
        ))}
      </div>
    </section>
  );
}

export function CredibilityAccuracyChart({ data }: { data: Analytics }) {
  const chartData = data.credibility_distribution || [
    { name: "High Authenticity", value: Math.round((data.credibility / 100) * data.review_count), percentage: data.credibility },
    { name: "Anomalous / Low", value: Math.max(0, data.review_count - Math.round((data.credibility / 100) * data.review_count)), percentage: 100 - data.credibility },
  ];

  return (
    <section className="panel chart-panel">
      <div className="section-kicker">Data Quality & NLP Accuracy</div>
      <h3>Review Credibility & Authenticity Audit</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={88}
            paddingAngle={4}
            stroke="none"
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={CREDIBILITY_COLORS[index % CREDIBILITY_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        {chartData.map((item, index) => (
          <span key={item.name}>
            <i style={{ background: CREDIBILITY_COLORS[index % CREDIBILITY_COLORS.length] }} />
            {item.name} <b>{item.percentage}%</b>
          </span>
        ))}
      </div>
    </section>
  );
}

export function RatingChart({ data }: { data: Analytics }) {
  return (
    <section className="panel chart-panel">
      <div className="section-kicker">Rating Quality</div>
      <h3>Star Rating Distribution Graph</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data.rating_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="ratingGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#d97706" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <XAxis dataKey="rating" tick={axisStyle} stroke="rgba(255,255,255,0.06)" />
          <YAxis allowDecimals={false} tick={axisStyle} stroke="rgba(255,255,255,0.06)" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Reviews" fill="url(#ratingGold)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

export function TrendChart({ data }: { data: Analytics }) {
  return (
    <section className="panel chart-panel">
      <div className="section-kicker">Review Momentum</div>
      <h3>Review Volume Timeline Graph</h3>
      {data.review_trend.length ? (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data.review_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="trendCyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="period" tick={axisStyle} stroke="rgba(255,255,255,0.06)" />
            <YAxis allowDecimals={false} tick={axisStyle} stroke="rgba(255,255,255,0.06)" />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="reviews"
              name="Reviews"
              stroke="#06b6d4"
              strokeWidth={3}
              fill="url(#trendCyan)"
              dot={{ r: 4, fill: "#38bdf8", stroke: "#060b14", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#34d399" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <p className="empty-chart">No chronological dates detected in dataset.</p>
      )}
    </section>
  );
}

export function SentimentComparisonChart({ data }: { data: Analytics }) {
  return (
    <section className="panel chart-panel">
      <div className="section-kicker">Signal Balance</div>
      <h3>Positive vs Negative Reviews Graph</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data.sentiment_comparison} layout="vertical" margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="posGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="negGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>
          <XAxis type="number" allowDecimals={false} tick={axisStyle} stroke="rgba(255,255,255,0.06)" />
          <YAxis type="category" dataKey="name" width={75} tick={axisStyle} stroke="rgba(255,255,255,0.06)" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" name="Reviews" radius={[0, 8, 8, 0]}>
            {data.sentiment_comparison.map((item) => (
              <Cell key={item.name} fill={item.name === "Positive" ? "url(#posGrad)" : "url(#negGrad)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
