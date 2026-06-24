import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, TrendingUp, FileText, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { AnalysisResult } from '@/types';
import { Heatmap } from './Heatmap';
import { SEVERITY_COLORS, ANOMALY_TYPE_LABELS, RISK_SCORE_COLORS } from '../constants';

interface DashboardProps {
  analysis: AnalysisResult;
}

export function Dashboard({ analysis }: DashboardProps) {
  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return 'bg-red-50 text-red-700 border-red-200';
    if (severity === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };
  
  const getSeverityIcon = (severity: string) => {
    if (severity === 'high') return <ShieldAlert className="w-5 h-5 text-red-600" />;
    if (severity === 'medium') return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    return <AlertTriangle className="w-5 h-5 text-blue-600" />;
  };

  const getAnomalyTypeLabel = (type: string) => ANOMALY_TYPE_LABELS[type] || type;

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-emerald-600';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full z-0 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-medium text-slate-500 uppercase tracking-wider text-xs">Risk Score</p>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <Activity className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className={`text-5xl font-bold tracking-tight ${getRiskScoreColor(analysis.riskScore)}`}>
                {analysis.riskScore}
              </p>
              <span className="text-sm font-medium text-slate-400">/100</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className={`px-2 py-0.5 rounded-full font-medium ${analysis.riskScore >= 70 ? 'bg-red-50 text-red-600' : analysis.riskScore >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {analysis.riskScore >= 70 ? 'High Risk' : analysis.riskScore >= 40 ? 'Medium Risk' : 'Low Risk'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full z-0 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-medium text-slate-500 uppercase tracking-wider text-xs">Transactions</p>
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-5xl font-bold tracking-tight text-slate-900">
              {analysis.totalTransactions.toLocaleString()}
            </p>
            <p className="mt-4 text-sm font-medium text-slate-500 flex items-center gap-1.5">
               <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Successfully Processed
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-red-50 to-orange-50 rounded-full z-0 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-medium text-slate-500 uppercase tracking-wider text-xs">Anomalies Detected</p>
              <div className="p-2 bg-red-50 rounded-lg border border-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-5xl font-bold tracking-tight text-red-600">
              {analysis.anomaliesDetected}
            </p>
            <p className="mt-4 text-sm font-medium text-red-600/80 flex items-center gap-1.5">
               Requires Immediate Review
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-full z-0 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-medium text-slate-500 uppercase tracking-wider text-xs">Documents</p>
              <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-5xl font-bold tracking-tight text-slate-900">
              {analysis.documents.length}
            </p>
            <p className="mt-4 text-sm font-medium text-slate-500 flex items-center gap-1.5">
               <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Analyzed completely
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Transaction Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Transaction Trend</h3>
            <p className="text-sm text-slate-500">Monthly volume of transactions processed</p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={analysis.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} tickFormatter={(value) => `$${value/1000}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#0f172a', fontWeight: 500 }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Amount ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Anomalies by Month */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Anomalies Detected</h3>
            <p className="text-sm text-slate-500">Distribution of flagged anomalies over time</p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={analysis.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="anomalies" fill="#ef4444" radius={[4, 4, 0, 0]} name="Anomalies" maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Transaction Activity Heatmap</h3>
          <p className="text-sm text-slate-500">Visualizes transaction patterns by day and time to identify unusual activity periods</p>
        </div>
        <div className="rounded-xl overflow-hidden border border-slate-100">
          <Heatmap data={analysis.heatmapData} />
        </div>
      </div>

      {/* Anomalies List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Requires Review</h3>
            <p className="text-sm text-slate-500 mt-1">Detailed list of detected anomalies and recommended actions</p>
          </div>
          <span className="px-4 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm">
            <AlertTriangle className="w-4 h-4" />
            {analysis.anomaliesDetected} Issues
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {analysis.anomalies.map((anomaly) => (
            <div key={anomaly.id} className="p-6 hover:bg-slate-50/80 transition-colors group">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-xl border shrink-0 ${anomaly.severity === 'high' ? 'bg-red-50 border-red-100' : anomaly.severity === 'medium' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                  {getSeverityIcon(anomaly.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h4 className="text-base font-semibold text-slate-900">{anomaly.description}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${getSeverityColor(anomaly.severity)}`}>
                        {anomaly.severity.toUpperCase()}
                      </span>
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-medium border border-slate-200">
                        {getAnomalyTypeLabel(anomaly.type)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed max-w-4xl">{anomaly.details}</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 items-start max-w-4xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Recommended Action</p>
                      <p className="text-sm font-medium text-slate-800">{anomaly.suggestedAction}</p>
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

