const API_URL = 'http://localhost:8000';

export async function analyzeDocuments(text: string, transactionData?: string) {
    const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            document_text: text,
            transaction_data: transactionData || "N/A",
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Analysis failed');
    }

    return response.json();
}
