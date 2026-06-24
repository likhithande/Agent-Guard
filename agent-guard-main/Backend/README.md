# Backend (Mock) — Agent Guard

This backend provides a lightweight mock implementation of the `/analyze` endpoint used by the frontend for demo purposes.

Run locally (from repository root `agent-guard-1`):

```bash
cd agent-guard-1
npm run dev
```

The root dev script launches both the frontend (Vite) and this FastAPI backend. The mock `/analyze` endpoint accepts JSON:

```json
{
  "document_text": "...",
  "transaction_data": "..."
}
```

and returns a simulated `AnalysisResult` payload compatible with the frontend.

If you prefer to run only the backend:

```bash
cd agent-guard-1
python -m uvicorn Backend.main:app --app-dir ./ --host 127.0.0.1 --port 8002 --reload
```

Note: This mock is for demo/testing and intentionally avoids heavy external dependencies.

Additional endpoints
- `POST /upload` — multipart file upload. Returns saved document metadata (id, name, type, size, uploadedAt, status).
- `POST /analyze` — accepts `document_text` OR `document_id`. If `document_id` is provided, the server will analyze the uploaded file's extracted text.

Example upload + analyze flow:

```bash
# upload a file
curl -X POST http://127.0.0.1:8002/upload -F "file=@/path/to/file.txt"

# response includes an `id` field; analyze by id
curl -X POST http://127.0.0.1:8002/analyze -H "Content-Type: application/json" \
  -d '{"document_id":"<id-from-upload>"}'
```
