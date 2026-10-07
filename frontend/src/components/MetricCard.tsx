import { ReactNode } from "react";
import { motion } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: string | number;
  detail: string;
  icon?: ReactNode;
  trend?: string;
  isPositive?: boolean;
}

export function MetricCard({ label, value, detail, icon, trend, isPositive }: MetricCardProps) {
  return (
    <motion.article 
      initial={{ opacity: 0, y: 16 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      className="metric-card"
    >
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        {icon && <div className="metric-icon-wrap">{icon}</div>}
      </div>
      <div>
        <div className="metric-value">{value}</div>
        <div className="metric-detail">{detail}</div>
      </div>
    </motion.article>
  );
}
