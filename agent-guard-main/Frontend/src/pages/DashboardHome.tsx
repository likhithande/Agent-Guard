import { useState } from 'react';
import { DocumentUpload } from '@/components/DocumentUpload';
import { Dashboard } from '@/components/Dashboard';
import { VoiceQuery } from '@/components/VoiceQuery';
import { ReportViewer } from '@/components/ReportViewer';
import { Footer } from '@/components/Footer';
import { FileText, BarChart3, Download, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { analyzeDocuments } from '@/lib/api';

import type { Document, Anomaly, AnalysisResult } from '@/types';

// Mock data for analysis
const MOCK_ANOMALIES = (docs: Document[]): Anomaly[] => [
    { id: '1', type: 'duplicate', severity: 'high', description: 'Duplicate invoice detected', documentId: docs[0]?.id || '1', details: 'Invoice #INV-2024-1234 appears twice with identical amounts ($45,230.00) but different dates.', suggestedAction: 'Review vendor records and payment history. One entry may need to be voided.' },
    { id: '2', type: 'unusual_amount', severity: 'high', description: 'Transaction amount exceeds normal range', documentId: docs[0]?.id || '1', details: 'Payment of $250,000 to vendor "ABC Corp" is 340% higher than average payment amount.', suggestedAction: 'Verify approval chain and supporting documentation for this large expenditure.' },
    { id: '3', type: 'missing_data', severity: 'medium', description: 'Missing approval signature', documentId: docs[1]?.id || '2', details: 'Purchase order #PO-5678 lacks required CFO approval signature for amounts over $50,000.', suggestedAction: 'Obtain retroactive approval or flag as policy violation.' },
    { id: '4', type: 'policy_violation', severity: 'medium', description: 'Expense submitted past deadline', documentId: docs[1]?.id || '2', details: 'Travel expense report submitted 62 days after trip completion (policy limit: 30 days).', suggestedAction: 'Require manager override or reject reimbursement per company policy.' },
    { id: '5', type: 'outlier', severity: 'low', description: 'Unusual payment timing pattern', documentId: docs[2]?.id || '3', details: 'Three consecutive payments to same vendor on same day, totaling $89,450.', suggestedAction: 'Confirm this is legitimate or investigate potential payment splitting to avoid approval thresholds.' }
];

const MOCK_CHART_DATA = [
    { month: 'Jan', amount: 45000, anomalies: 2, category: 'Operations' },
    { month: 'Feb', amount: 52000, anomalies: 1, category: 'Operations' },
    { month: 'Mar', amount: 48000, anomalies: 3, category: 'Operations' },
    { month: 'Apr', amount: 61000, anomalies: 2, category: 'Operations' },
    { month: 'May', amount: 55000, anomalies: 4, category: 'Operations' },
    { month: 'Jun', amount: 250000, anomalies: 8, category: 'Capital' }
];

const MOCK_HEATMAP_DATA: Record<string, Record<string, number>> = {
    'Mon': { '9AM': 12, '12PM': 8, '3PM': 15, '6PM': 3 },
    'Tue': { '9AM': 10, '12PM': 14, '3PM': 11, '6PM': 2 },
    'Wed': { '9AM': 25, '12PM': 18, '3PM': 22, '6PM': 5 },
    'Thu': { '9AM': 13, '12PM': 9, '3PM': 16, '6PM': 4 },
    'Fri': { '9AM': 11, '12PM': 7, '3PM': 19, '6PM': 1 }
};

const generateMockAnalysis = (docs: Document[]): AnalysisResult => {
    const anomalies = MOCK_ANOMALIES(docs);
    return {
        riskScore: 73,
        totalTransactions: 1247,
        anomaliesDetected: anomalies.length,
        anomalies,
        documents: docs.map(d => ({ ...d, status: 'completed' as const })),
        chartData: MOCK_CHART_DATA,
        heatmapData: MOCK_HEATMAP_DATA
    };
};

type View = 'upload' | 'dashboard' | 'report';

export default function DashboardHome() {
    const [currentView, setCurrentView] = useState<View>('upload');
    const [documents, setDocuments] = useState<Document[]>([]);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const { logout, user } = useAuth();

    const handleDocumentsUploaded = async (uploadedFiles: File[]) => {
        // 1. Convert files to metadata for the UI
        const newDocs: Document[] = uploadedFiles.map((file, index) => ({
            id: `doc-${Date.now()}-${index}`,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date(),
            status: 'processing' as const
        }));

        const loadingToast = toast.loading('Reading documents and starting AI analysis...');

        try {
            const allDocs = [...documents, ...newDocs];
            setDocuments(allDocs);

            // 2. Read the first file as text (for simplified analysis)
            // In a real app, you might want to combine texts or use OCR
            const fileTexts = await Promise.all(uploadedFiles.map(file => {
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string || "");
                    reader.readAsText(file);
                });
            }));

            const combinedText = fileTexts.join("\n\n---\n\n");

            // 3. Call Real-Time Backend
            const result = await analyzeDocuments(combinedText);

            // 4. Map backend result to frontend state
            const mappedAnomalies: Anomaly[] = result.anomalies.map((a: any, i: number) => ({
                id: `anomaly-${Date.now()}-${i}`,
                type: a.type.toLowerCase() as any,
                severity: a.severity.toLowerCase() as any,
                description: a.details,
                documentId: newDocs[0]?.id || '1',
                details: a.details,
                suggestedAction: a.suggestedAction || 'Review required'
            }));

            const finalResult: AnalysisResult = {
                riskScore: result.riskScore,
                totalTransactions: result.totalTransactions,
                anomaliesDetected: mappedAnomalies.length,
                anomalies: mappedAnomalies,
                documents: allDocs.map(d => ({ ...d, status: 'completed' as const })),
                chartData: MOCK_CHART_DATA, // We can keep mock chart data for now or generate it
                heatmapData: MOCK_HEATMAP_DATA,
                // Adding extra fields from backend if needed
                report: result.report,
                compliance: result.compliance,
                forensic: result.forensic
            };

            setAnalysisResult(finalResult);
            setCurrentView('dashboard');
            toast.dismiss(loadingToast);
            toast.success('AI Analysis complete!');
        } catch (error: any) {
            console.error('Analysis error, falling back to mock:', error);

            // EMERGENCY FALLBACK for review
            const mockResult = generateMockAnalysis(newDocs);
            setAnalysisResult(mockResult);
            setCurrentView('dashboard');

            toast.dismiss(loadingToast);
            toast.warning(`Backend unavailable - using simulated analysis for demo.`);
        }
    };

    const getNavButtonClass = (view: 'upload' | 'dashboard' | 'report', isDisabled = false) => {
        const baseClass = 'px-4 py-2 rounded-lg flex items-center gap-2 transition-colors';
        if (isDisabled) return `${baseClass} opacity-50 cursor-not-allowed`;
        if (currentView === view) return `${baseClass} bg-blue-600 text-white`;
        return `${baseClass} bg-slate-100 text-slate-700 hover:bg-slate-200`;
    };

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-slate-900">Agent Guard</h1>
                                    <p className="text-sm text-slate-600">AI Finanial Auditor</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentView('upload')} className={getNavButtonClass('upload')}>
                                        <FileText className="w-4 h-4" />
                                        Upload
                                    </button>
                                    <button onClick={() => setCurrentView('dashboard')} disabled={!analysisResult} className={getNavButtonClass('dashboard', !analysisResult)}>
                                        <BarChart3 className="w-4 h-4" />
                                        Dashboard
                                    </button>
                                    <button onClick={() => setCurrentView('report')} disabled={!analysisResult} className={getNavButtonClass('report', !analysisResult)}>
                                        <Download className="w-4 h-4" />
                                        Report
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 border-l pl-4 ml-2">
                                    <span className="text-sm text-slate-500 hidden md:inline-block">{user?.email}</span>
                                    <button onClick={logout} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" title="Logout">
                                        <LogOut className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {currentView === 'upload' && (
                        <DocumentUpload onDocumentsUploaded={handleDocumentsUploaded} />
                    )}

                    {currentView === 'dashboard' && analysisResult && (
                        <Dashboard analysis={analysisResult} />
                    )}

                    {currentView === 'report' && analysisResult && (
                        <ReportViewer analysis={analysisResult} />
                    )}
                </main>

                {/* Voice Query - Available once analysis exists */}
                {analysisResult && <VoiceQuery analysis={analysisResult} />}
            </div>

            {/* Footer */}
            <Footer />
        </>
    );
}
