from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Any, Optional
from datetime import datetime
import re
import uuid
import random
from pathlib import Path
import json

app = FastAPI()

# Allow the frontend dev server to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    document_text: Optional[str] = None
    transaction_data: Optional[str] = None
    document_id: Optional[str] = None


UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Simple in-memory store for uploaded document metadata and text
DOCUMENT_STORE: dict = {}


@app.get("/")
def root():
    return {"status": "running"}


def _parse_transactions(text: str) -> List[float]:
    # crude numeric extraction for demo purposes
    if not text:
        return []
    nums = re.findall(r"\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b", text.replace('$', ''))
    cleaned = []
    for n in nums:
        try:
            v = float(n.replace(',', ''))
            cleaned.append(v)
        except Exception:
            continue
    return cleaned


def _extract_text_from_file(path: Path) -> str:
    # txt: read directly, pdf: try to use pypdf, otherwise simulate
    suffix = path.suffix.lower()
    try:
        if suffix == '.txt':
            return path.read_text(encoding='utf-8', errors='ignore')
        if suffix == '.pdf':
            try:
                from pypdf import PdfReader
                reader = PdfReader(str(path))
                out = []
                for page in reader.pages:
                    out.append(page.extract_text() or '')
                return '\n'.join(out)
            except Exception:
                return 'PDF content could not be extracted; using placeholder text.'
        # fallback for unsupported types
        return path.read_text(encoding='utf-8', errors='ignore')[:4096]
    except Exception:
        return ''


@app.post('/upload')
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    file_id = str(uuid.uuid4())
    save_name = f"{file_id}_{file.filename}"
    save_path = UPLOAD_DIR / save_name
    with open(save_path, 'wb') as fh:
        fh.write(contents)

    text = _extract_text_from_file(save_path)

    meta = {
        'id': file_id,
        'name': file.filename,
        'type': file.content_type or save_path.suffix.replace('.', ''),
        'size': save_path.stat().st_size,
        'uploadedAt': datetime.utcnow().isoformat(),
        'status': 'completed',
        'path': str(save_path),
        'text': text,
    }
    DOCUMENT_STORE[file_id] = meta

    return {k: meta[k] for k in meta if k != 'text'}


@app.get('/documents')
def list_documents():
    # return list of documents (no internal path/text)
    out = []
    for d in DOCUMENT_STORE.values():
        out.append({
            'id': d['id'],
            'name': d['name'],
            'type': d['type'],
            'size': d['size'],
            'uploadedAt': d['uploadedAt'],
            'status': d['status'],
        })
    return out


@app.delete('/documents/{doc_id}')
def delete_document(doc_id: str):
    doc = DOCUMENT_STORE.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail='document not found')
    # attempt to remove file
    try:
        p = Path(doc.get('path', ''))
        if p.exists():
            p.unlink()
    except Exception:
        pass
    DOCUMENT_STORE.pop(doc_id, None)
    return {'ok': True}


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    # Determine text source: explicit document_text, or document_id
    text = req.document_text or ''
    if req.document_id:
        doc = DOCUMENT_STORE.get(req.document_id)
        if not doc:
            raise HTTPException(status_code=404, detail='document_id not found')
        text = doc.get('text', '')

    docs = []
    if req.document_id and req.document_id in DOCUMENT_STORE:
        d = DOCUMENT_STORE[req.document_id]
        docs = [
            {
                'id': d['id'],
                'name': d['name'],
                'type': d['type'],
                'size': d['size'],
                'uploadedAt': d['uploadedAt'],
                'status': d['status'],
            }
        ]
    else:
        docs = [
            {
                'id': str(uuid.uuid4()),
                'name': 'uploaded_document_1.pdf',
                'type': 'pdf',
                'size': 256000,
                'uploadedAt': datetime.utcnow().isoformat(),
                'status': 'completed',
            }
        ]

    tx_values = _parse_transactions(text)
    total_tx = len(tx_values)

    anomalies = []
    seen = set()
    for v in tx_values:
        if v in seen:
            anomalies.append({
                'id': str(uuid.uuid4()),
                'type': 'duplicate',
                'severity': 'medium',
                'description': f'Duplicate transaction amount {v}',
                'documentId': docs[0]['id'],
                'details': f'Amount {v} appears multiple times.',
                'suggestedAction': 'Verify duplicate transaction IDs and timestamps.',
            })
        seen.add(v)
        if v > 100000:
            anomalies.append({
                'id': str(uuid.uuid4()),
                'type': 'unusual_amount',
                'severity': 'high',
                'description': f'Unusually large transaction {v}',
                'documentId': docs[0]['id'],
                'details': 'This transaction greatly exceeds typical amounts.',
                'suggestedAction': 'Confirm authorization and source of funds.',
            })

    if not anomalies:
        anomalies = [
            {
                'id': str(uuid.uuid4()),
                'type': 'missing_data',
                'severity': 'low',
                'description': 'Missing transaction reference',
                'documentId': docs[0]['id'],
                'details': 'Some transactions lack reference IDs.',
                'suggestedAction': 'Request original source documents.',
            }
        ]

    risk_score = min(100, 20 + len(anomalies) * 30 + (total_tx // 10))

    result = {
        'riskScore': risk_score,
        'totalTransactions': total_tx,
        'anomaliesDetected': len(anomalies),
        'anomalies': anomalies,
        'documents': docs,
        'chartData': [],
        'heatmapData': {},
        'report': 'This is a simulated analysis for demo purposes.',
    }

    return result
