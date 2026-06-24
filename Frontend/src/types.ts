export type Document = {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: Date;
    status: 'processing' | 'completed' | 'error';
};

export type Anomaly = {
    id: string;
    type: 'duplicate' | 'unusual_amount' | 'missing_data' | 'policy_violation' | 'outlier';
    severity: 'high' | 'medium' | 'low';
    description: string;
    documentId: string;
    details: string;
    suggestedAction: string;
};

export type AnalysisResult = {
    riskScore: number;
    totalTransactions: number;
    anomaliesDetected: number;
    anomalies: Anomaly[];
    documents: Document[];
    chartData: any[];
    heatmapData: Record<string, Record<string, number>>;
    report?: string;
    compliance?: any[];
    forensic?: any[];
};
