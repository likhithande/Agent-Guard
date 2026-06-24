// Color constants for severity levels
export const SEVERITY_COLORS = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  default: 'bg-slate-100 text-slate-800 border-slate-200',
} as const;

// Anomaly type labels
export const ANOMALY_TYPE_LABELS: Record<string, string> = {
  duplicate: 'Duplicate Entry',
  unusual_amount: 'Unusual Amount',
  missing_data: 'Missing Data',
  policy_violation: 'Policy Violation',
  outlier: 'Statistical Outlier',
};

// Risk score color mapping
export const RISK_SCORE_COLORS = {
  high: 'text-red-600',    // >= 70
  medium: 'text-yellow-600', // >= 40
  low: 'text-green-600',   // < 40
} as const;
