import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, TrendingUp, FileText, Activity } from 'lucide-react';
import type { AnalysisResult } from '@/types';
import { Heatmap } from './Heatmap';
import { SEVERITY_COLORS, ANOMALY_TYPE_LABELS, RISK_SCORE_COLORS } from '../constants';

interface DashboardProps {
  analysis: AnalysisResult;
}

export function Dashboard({ analysis }: DashboardProps) {
  const getSeverityColor = (severity: string) => SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.default;
  const getAnomalyTypeLabel = (type: string) => ANOMALY_TYPE_LABELS[type] || type;

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return RISK_SCORE_COLORS.high;
    if (score >= 40) return RISK_SCORE_COLORS.medium;
    return RISK_SCORE_COLORS.low;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Risk Score</p>
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <p className={`text-4xl ${getRiskScoreColor(analysis.riskScore)}`}>
            {analysis.riskScore}
          </p>
          <p className="text-xs text-slate-500 mt-1">Out of 100</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Total Transactions</p>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-4xl text-slate-900">
            {analysis.totalTransactions.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Processed</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Anomalies Detected</p>
            <AlertTriangle className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-4xl text-red-600">
            {analysis.anomaliesDetected}
          </p>
          <p className="text-xs text-slate-500 mt-1">Requires review</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Documents Analyzed</p>
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-4xl text-slate-900">
            {analysis.documents.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">All completed</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Transaction Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-slate-900 mb-4">Transaction Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analysis.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Amount ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Anomalies by Month */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-slate-900 mb-4">Anomalies by Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analysis.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="anomalies" fill="#ef4444" name="Anomalies" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-slate-900 mb-4">Transaction Activity Heatmap</h3>
        <p className="text-sm text-slate-600 mb-4">
          Visualizes transaction patterns by day and time to identify unusual activity periods
        </p>
        <Heatmap data={analysis.heatmapData} />
      </div>

      {/* Anomalies List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-slate-900">Detected Anomalies</h3>
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
            {analysis.anomaliesDetected} issues
          </span>
        </div>

        <div className="space-y-4">
          {analysis.anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${anomaly.severity === 'high' ? 'text-red-600' :
                    anomaly.severity === 'medium' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-slate-900">{anomaly.description}</h4>
                      <span className={`px-2 py-1 rounded text-xs border ${getSeverityColor(anomaly.severity)}`}>
                        {anomaly.severity.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                        {getAnomalyTypeLabel(anomaly.type)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{anomaly.details}</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-900 mb-1">Recommended Action:</p>
                      <p className="text-sm text-blue-800">{anomaly.suggestedAction}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
