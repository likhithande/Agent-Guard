import { Download, FileText, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import type { AnalysisResult } from '@/types';
import { SEVERITY_COLORS, ANOMALY_TYPE_LABELS } from '../constants';

interface ReportViewerProps {
  analysis: AnalysisResult;
}

export function ReportViewer({ analysis }: ReportViewerProps) {
  const generateReport = () => {
    const reportContent = `
AI FINANCIAL AUDIT REPORT
Generated: ${new Date().toLocaleString()}

═══════════════════════════════════════════════════════════════

EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════

Risk Score: ${analysis.riskScore}/100 (${analysis.riskScore >= 70 ? 'HIGH RISK' : analysis.riskScore >= 40 ? 'MODERATE RISK' : 'LOW RISK'})
Total Transactions Analyzed: ${analysis.totalTransactions.toLocaleString()}
Documents Processed: ${analysis.documents.length}
Anomalies Detected: ${analysis.anomaliesDetected}

═══════════════════════════════════════════════════════════════

RISK ASSESSMENT
═══════════════════════════════════════════════════════════════

The automated analysis has identified ${analysis.anomaliesDetected} anomalies requiring 
auditor review. These have been categorized by severity and type to facilitate 
efficient investigation.

Severity Breakdown:
- High Severity: ${analysis.anomalies.filter(a => a.severity === 'high').length} issues
- Medium Severity: ${analysis.anomalies.filter(a => a.severity === 'medium').length} issues
- Low Severity: ${analysis.anomalies.filter(a => a.severity === 'low').length} issues

═══════════════════════════════════════════════════════════════

DETAILED ANOMALIES
═══════════════════════════════════════════════════════════════

${analysis.anomalies.map((anomaly, index) => `
${index + 1}. ${anomaly.description.toUpperCase()}
   Severity: ${anomaly.severity.toUpperCase()}
   Type: ${anomaly.type.replace('_', ' ').toUpperCase()}
   
   Details:
   ${anomaly.details}
   
   Recommended Action:
   ${anomaly.suggestedAction}
   
   Document Reference: ${anomaly.documentId}
   
   ${'─'.repeat(60)}
`).join('\n')}

═══════════════════════════════════════════════════════════════

METHODOLOGY
═══════════════════════════════════════════════════════════════

This report was generated using AI-powered document analysis with the 
following detection algorithms:

1. Duplicate Detection: Cross-references transaction IDs, amounts, and dates
2. Statistical Outlier Analysis: Identifies transactions outside 3σ range
3. Policy Compliance: Validates against configurable business rules
4. Pattern Recognition: Detects unusual timing and frequency patterns
5. Missing Data Detection: Flags incomplete or improperly formatted entries

═══════════════════════════════════════════════════════════════

PROCESSED DOCUMENTS
═══════════════════════════════════════════════════════════════

${analysis.documents.map((doc, index) => `
${index + 1}. ${doc.name}
   Document ID: ${doc.id}
   Type: ${doc.type}
   Size: ${(doc.size / 1024).toFixed(2)} KB
   Uploaded: ${doc.uploadedAt.toLocaleString()}
   Status: ${doc.status.toUpperCase()}
`).join('\n')}
`;

    return reportContent;
  };

  const downloadReport = (format: 'txt' | 'html' | 'pdf') => {
    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'txt') {
      content = generateReport();
      mimeType = 'text/plain';
      extension = 'txt';
    } else if (format === 'html') {
      content = generateHTMLReport();
      mimeType = 'text/html';
      extension = 'html';
    } else {
      // PDF format
      const htmlContent = generateHTMLReport();
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      const opt = {
        margin: 10,
        filename: `audit-report-${Date.now()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait' as 'portrait', unit: 'mm', format: 'a4' },
      };
      html2pdf().set(opt).from(element).save();
      return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateHTMLReport = () => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Financial Audit Report</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; }
        h1 { color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #475569; margin-top: 30px; border-left: 4px solid #3b82f6; padding-left: 12px; }
        .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .metric { display: inline-block; margin-right: 30px; }
        .metric-label { font-size: 12px; color: #64748b; }
        .metric-value { font-size: 24px; font-weight: bold; color: #1e293b; }
        .anomaly { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 15px 0; background: white; }
        .severity-high { border-left: 4px solid #ef4444; }
        .severity-medium { border-left: 4px solid #f59e0b; }
        .severity-low { border-left: 4px solid #3b82f6; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-right: 8px; }
        .badge-high { background: #fee2e2; color: #991b1b; }
        .badge-medium { background: #fef3c7; color: #92400e; }
        .badge-low { background: #dbeafe; color: #1e40af; }
        .action-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px; margin-top: 10px; }
    </style>
</head>
<body>
    <h1>🔍 AI Financial Audit Report</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    
    <div class="summary-box">
        <h2>Executive Summary</h2>
        <div class="metric">
            <div class="metric-label">Risk Score</div>
            <div class="metric-value" style="color: ${analysis.riskScore >= 70 ? '#ef4444' : analysis.riskScore >= 40 ? '#f59e0b' : '#22c55e'}">
                ${analysis.riskScore}/100
            </div>
        </div>
        <div class="metric">
            <div class="metric-label">Transactions</div>
            <div class="metric-value">${analysis.totalTransactions.toLocaleString()}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Anomalies</div>
            <div class="metric-value" style="color: #ef4444">${analysis.anomaliesDetected}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Documents</div>
            <div class="metric-value">${analysis.documents.length}</div>
        </div>
    </div>

    <h2>Risk Assessment</h2>
    <p>The automated analysis has identified <strong>${analysis.anomaliesDetected} anomalies</strong> requiring auditor review. 
    These have been categorized by severity and type to facilitate efficient investigation.</p>
    <ul>
        <li>High Severity: ${analysis.anomalies.filter(a => a.severity === 'high').length} issues</li>
        <li>Medium Severity: ${analysis.anomalies.filter(a => a.severity === 'medium').length} issues</li>
        <li>Low Severity: ${analysis.anomalies.filter(a => a.severity === 'low').length} issues</li>
    </ul>

    <h2>Detailed Anomalies</h2>
    ${analysis.anomalies.map((anomaly, index) => `
        <div class="anomaly severity-${anomaly.severity}">
            <h3 style="margin-top: 0;">
                ${index + 1}. ${anomaly.description}
                <span class="badge badge-${anomaly.severity}">${anomaly.severity.toUpperCase()}</span>
            </h3>
            <p><strong>Type:</strong> ${anomaly.type.replace('_', ' ').toUpperCase()}</p>
            <p>${anomaly.details}</p>
            <div class="action-box">
                <strong>Recommended Action:</strong><br>
                ${anomaly.suggestedAction}
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Document Reference: ${anomaly.documentId}</p>
        </div>
    `).join('')}

    <h2>Methodology</h2>
    <p>This report was generated using AI-powered document analysis with the following detection algorithms:</p>
    <ol>
        <li><strong>Duplicate Detection:</strong> Cross-references transaction IDs, amounts, and dates</li>
        <li><strong>Statistical Outlier Analysis:</strong> Identifies transactions outside 3σ range</li>
        <li><strong>Policy Compliance:</strong> Validates against configurable business rules</li>
        <li><strong>Pattern Recognition:</strong> Detects unusual timing and frequency patterns</li>
        <li><strong>Missing Data Detection:</strong> Flags incomplete or improperly formatted entries</li>
    </ol>

    <h2>Processed Documents</h2>
    <table style="width: 100%; border-collapse: collapse;">
        <thead>
            <tr style="background: #f8fafc; text-align: left;">
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Document Name</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Type</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Size</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Status</th>
            </tr>
        </thead>
        <tbody>
            ${analysis.documents.map(doc => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${doc.name}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${doc.type}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${(doc.size / 1024).toFixed(2)} KB</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                        <span style="color: #22c55e;">✓</span> ${doc.status}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div style="margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #64748b;">
        <p><strong>Certification:</strong> This automated analysis was performed using AI technology and should be reviewed 
        by a qualified auditor. All flagged anomalies require human verification before final determination.</p>
        <p style="margin-bottom: 0;">Report ID: ${Date.now()} | Generated by: AI Financial Auditor Platform v1.0.0</p>
    </div>
</body>
</html>
`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Download Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-slate-900 mb-1">AI-Generated Audit Report</h2>
            <p className="text-sm text-slate-600">
              Comprehensive analysis with explainable findings for auditors
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => downloadReport('txt')}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download TXT
            </button>
            <button
              onClick={() => downloadReport('html')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download HTML
            </button>
            <button
              onClick={() => downloadReport('pdf')}
              className="px-4 py-2 bg-gradient-to-r from-black-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              <p className="text-sm text-slate-600">Risk Score</p>
            </div>
            <p className={`text-2xl ${getSeverityColor(analysis.riskScore >= 70 ? 'high' : analysis.riskScore >= 40 ? 'medium' : 'low')}`}>
              {analysis.riskScore}/100
            </p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <p className="text-sm text-slate-600">Documents</p>
            </div>
            <p className="text-2xl text-slate-900">{analysis.documents.length}</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-slate-600" />
              <p className="text-sm text-slate-600">Transactions</p>
            </div>
            <p className="text-2xl text-slate-900">{analysis.totalTransactions.toLocaleString()}</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-slate-600" />
              <p className="text-sm text-slate-600">Anomalies</p>
            </div>
            <p className="text-2xl text-red-600">{analysis.anomaliesDetected}</p>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-slate-900 mb-6 flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Report Preview
        </h2>

        <div className="prose max-w-none">
          {analysis.report ? (
            <div className="bg-slate-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
              <h3 className="text-slate-900 mt-0 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                AI Analysis Narrative
              </h3>
              <div className="whitespace-pre-wrap text-slate-800 leading-relaxed font-serif">
                {analysis.report}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-l-4 border-blue-600 p-4 mb-6">
              <h3 className="text-slate-900 mt-0">Executive Summary</h3>
              <p className="text-slate-700 mb-0">
                Automated analysis of {analysis.documents.length} financial documents containing{' '}
                {analysis.totalTransactions.toLocaleString()} transactions. The system identified{' '}
                {analysis.anomaliesDetected} anomalies with a composite risk score of {analysis.riskScore}/100.
              </p>
            </div>
          )}

          <h3 className="text-slate-900">Key Findings</h3>
          <ul className="space-y-2">
            <li>
              <strong>High Severity Issues:</strong>{' '}
              {analysis.anomalies.filter(a => a.severity === 'high').length} items requiring immediate attention
            </li>
            <li>
              <strong>Medium Severity Issues:</strong>{' '}
              {analysis.anomalies.filter(a => a.severity === 'medium').length} items for review
            </li>
            <li>
              <strong>Low Severity Issues:</strong>{' '}
              {analysis.anomalies.filter(a => a.severity === 'low').length} informational items
            </li>
          </ul>

          <h3 className="text-slate-900">Top Anomalies</h3>
          <div className="space-y-4">
            {analysis.anomalies.slice(0, 3).map((anomaly, index) => (
              <div key={anomaly.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-sm">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <h4 className="text-slate-900 mt-0 mb-2">{anomaly.description}</h4>
                    <p className="text-sm text-slate-600 mb-3">{anomaly.details}</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-900 mb-1">Recommended Action:</p>
                      <p className="text-sm text-blue-800 mb-0">{anomaly.suggestedAction}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-slate-900">Methodology</h3>
          <p className="text-slate-700">
            This report was generated using advanced AI algorithms that analyze patterns, detect anomalies,
            and provide explainable insights for auditors. The system employs:
          </p>
          <ul>
            <li>Statistical outlier detection (3σ analysis)</li>
            <li>Duplicate transaction identification</li>
            <li>Policy compliance validation</li>
            <li>Pattern recognition for unusual activity</li>
            <li>Missing data detection</li>
          </ul>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-yellow-900 mb-0">
              <strong>Note:</strong> This automated analysis should be reviewed by a qualified auditor.
              All flagged anomalies require human verification before final determination.
            </p>
          </div>
        </div>
      </div>
    </div >
  );
}
