"""Full Agent Guard backend.

Note: `Backend/main.py` is intentionally minimal per your request.
Run this full backend with:
  uvicorn Backend.full_app:app --reload --port 8000

This module contains:
- /analyze (JSON)
- /documents/analyze (multipart upload)
- /documents (list stored docs)
- /health
"""

from __future__ import annotations

import asyncio
import json
import os
import traceback
import uuid
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google.adk import Agent, Runner
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.genai import types
from pydantic import BaseModel

from Backend.gcp_config import load_gcp_config
from Backend.gcp_services import (
    build_persistence_record,
    extract_text_with_document_ai,
    list_recent_firestore_records,
    store_analysis_in_firestore,
    store_in_content_warehouse,
    upload_to_gcs,
)


def _raise_if_gemini_auth_error(err: Exception) -> None:
    msg = str(err)
    haystack = msg.lower()
    if (
        "api key expired" in haystack
        or "api_key_invalid" in haystack
        or "api key invalid" in haystack
        or "api_key" in haystack and "invalid" in haystack
        or "generativelanguage.googleapis.com" in haystack and "invalid_argument" in haystack
    ):
        raise HTTPException(
            status_code=401,
            detail=(
                "Gemini API key is invalid or expired. "
                "Renew it in AI Studio and set GOOGLE_API_KEY (Backend/.env or your shell), then restart the backend."
            ),
        )

# Load environment variables from Backend/.env (preferred) and repo-root .env (fallback)
load_dotenv(dotenv_path=Path(__file__).with_name(".env"), override=False)
load_dotenv(override=False)

cfg = load_gcp_config()

app = FastAPI(title="Agent Guard API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUDITOR_SYSTEM_PROMPT = """
ROLE:
You are an AI Financial Auditor Agent.

OBJECTIVE:
Analyze financial documents and transaction data to detect anomalies, assess risk, and produce explainable audit findings.

TASKS:
1. Detect statistical anomalies using the 3-sigma (3σ) rule.
2. Identify duplicate, inconsistent, or unusual transactions.
3. Assign a risk score between 0 and 100.
4. Provide clear, auditor-friendly explanations.
5. Recommend actionable next steps.

RULES:
- Do not hallucinate.
- If data is insufficient, clearly state uncertainty.
- Be explainable and conservative.
- Think step-by-step before producing results.

OUTPUT (STRICT JSON ONLY):
{
  "riskScore": number,
  "totalTransactions": number,
  "anomalies": [
    {
      "type": "duplicate | unusual_amount | missing_data | policy_violation | outlier",
      "severity": "low | medium | high",
      "details": "clear explanation",
      "suggestedAction": "recommended auditor action"
    }
  ]
}
"""

COMPLIANCE_SYSTEM_PROMPT = """
ROLE:
You are a Financial Compliance Agent specialized in tax laws, regulatory frameworks, and corporate policies.

OBJECTIVE:
Verify whether audit findings comply with applicable financial regulations and internal policies.

TASKS:
1. Identify possible compliance violations.
2. Map issues to relevant laws or policies.
3. Classify each issue as CONFIRMED or POTENTIAL.
4. Recommend corrective actions.

RULES:
- Base conclusions only on provided data.
- Clearly explain reasoning.
- Avoid assumptions or speculation.

OUTPUT (STRICT JSON ONLY):
{
  "complianceIssues": [
    {
      "rule": "regulation or policy name",
      "status": "CONFIRMED | POTENTIAL",
      "explanation": "reason for violation",
      "recommendedAction": "corrective step"
    }
  ]
}
"""

FORENSIC_SYSTEM_PROMPT = """
ROLE:
You are a Forensic Financial Investigation Agent.

OBJECTIVE:
Detect complex fraud patterns such as money laundering, circular transactions, or coordinated financial abuse.

TASKS:
1. Analyze transaction relationships and timing.
2. Detect coordinated or circular money flows.
3. Assess fraud likelihood and confidence level.

RULES:
- Think like a forensic investigator.
- Focus on behavior patterns, not just statistics.
- Provide evidence-based explanations.

OUTPUT (STRICT JSON ONLY):
{
  "forensicFindings": [
    {
      "pattern": "description of suspicious behavior",
      "confidence": "LOW | MEDIUM | HIGH",
      "evidence": "supporting explanation"
    }
  ]
}
"""

NOTIFICATION_SYSTEM_PROMPT = """
ROLE:
You are a Risk Notification Decision Agent.

OBJECTIVE:
Decide whether human intervention is required and whether alerts should be triggered.

TASKS:
1. Evaluate severity and confidence.
2. Decide if an alert is necessary.
3. Assign alert priority.
4. Generate a concise alert message.

RULES:
- Avoid alert fatigue.
- Trigger alerts only when justified.
- Be conservative and precise.

OUTPUT (STRICT JSON ONLY):
{
  "triggerAlert": true | false,
  "priority": "LOW | MEDIUM | HIGH",
  "message": "concise actionable alert"
}
"""

REPORT_GENERATION_SYSTEM_PROMPT = """
ROLE:
You are a Financial Audit Report Generation Agent.

OBJECTIVE:
Convert structured audit data into a professional, human-readable audit report.

TASKS:
1. Write an executive summary.
2. Highlight key risks and anomalies.
3. Summarize compliance status.
4. Provide recommended actions.

STYLE:
- Professional
- Neutral
- Explainable
- Legally safe language
"""

session_service = InMemorySessionService()


async def run_agent_turn(agent: Agent, query_text: str) -> str:
    app_name = "AgentGuard"
    user_id = "anonymous"
    session_id = str(uuid.uuid4())

    await session_service.create_session(app_name=app_name, user_id=user_id, session_id=session_id)

    runner = Runner(app_name=app_name, agent=agent, session_service=session_service)

    new_message = types.Content(parts=[types.Part(text=query_text)])

    response_text = ""
    async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=new_message):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    response_text += part.text

    return response_text


def clean_json_response(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


async def analyze_financials(document_text: str, transaction_data: str) -> dict:
    agent = Agent(name="AuditorAgent", model="gemini-1.5-flash", instruction=AUDITOR_SYSTEM_PROMPT)
    query = f"DOCUMENT_TEXT:\n{document_text}\n\nTRANSACTION_DATA:\n{transaction_data}"
    try:
        response = await run_agent_turn(agent, query)
        return json.loads(clean_json_response(response))
    except Exception as e:
        _raise_if_gemini_auth_error(e)
        raise


async def verify_compliance(audit_output: dict, regulatory_policies: str = "Standard Financial Regulations") -> dict:
    agent = Agent(name="ComplianceAgent", model="gemini-1.5-flash", instruction=COMPLIANCE_SYSTEM_PROMPT)
    query = f"AUDITOR_AGENT_OUTPUT:\n{json.dumps(audit_output)}\n\nREGULATORY_POLICIES:\n{regulatory_policies}"
    try:
        response = await run_agent_turn(agent, query)
        return json.loads(clean_json_response(response))
    except Exception as e:
        _raise_if_gemini_auth_error(e)
        raise


async def investigate_fraud(high_risk_transactions: list[dict], transaction_graph: str = "N/A") -> dict:
    agent = Agent(name="ForensicAgent", model="gemini-1.5-flash", instruction=FORENSIC_SYSTEM_PROMPT)
    query = (
        f"HIGH_RISK_TRANSACTIONS:\n{json.dumps(high_risk_transactions)}\n\nTRANSACTION_GRAPH_DATA:\n{transaction_graph}"
    )
    try:
        response = await run_agent_turn(agent, query)
        return json.loads(clean_json_response(response))
    except Exception as e:
        _raise_if_gemini_auth_error(e)
        raise


async def decide_alerts(final_audit_results: dict) -> dict:
    agent = Agent(name="NotificationAgent", model="gemini-1.5-flash", instruction=NOTIFICATION_SYSTEM_PROMPT)
    query = f"FINAL_AUDIT_RESULTS:\n{json.dumps(final_audit_results)}"
    try:
        response = await run_agent_turn(agent, query)
        return json.loads(clean_json_response(response))
    except Exception as e:
        _raise_if_gemini_auth_error(e)
        raise


async def generate_audit_report(all_agent_outputs: dict) -> str:
    agent = Agent(name="ReportAgent", model="gemini-1.5-flash", instruction=REPORT_GENERATION_SYSTEM_PROMPT)
    query = f"ALL_AGENT_OUTPUTS:\n{json.dumps(all_agent_outputs)}"
    try:
        return await run_agent_turn(agent, query)
    except Exception as e:
        _raise_if_gemini_auth_error(e)
        raise


class AnalysisRequest(BaseModel):
    document_text: str
    transaction_data: Optional[str] = "N/A"


@app.post("/analyze")
async def analyze_endpoint(request: AnalysisRequest):
    if not os.getenv("GOOGLE_API_KEY"):
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY is missing in the backend environment.")

    audit_results = await analyze_financials(request.document_text, request.transaction_data or "N/A")

    high_risk = [a for a in audit_results.get("anomalies", []) if a.get("severity") == "high"]
    compliance_task = verify_compliance(audit_results)
    forensic_task = investigate_fraud(high_risk)
    compliance_results, forensic_results = await asyncio.gather(compliance_task, forensic_task)

    all_results = {"audit": audit_results, "compliance": compliance_results, "forensic": forensic_results}
    notification_task = decide_alerts(all_results)
    report_task = generate_audit_report(all_results)
    notification_results, report_text = await asyncio.gather(notification_task, report_task)

    response_payload = {
        "status": "success",
        "riskScore": audit_results.get("riskScore", 0),
        "totalTransactions": audit_results.get("totalTransactions", 0),
        "anomalies": audit_results.get("anomalies", []),
        "compliance": compliance_results.get("complianceIssues", []),
        "forensic": forensic_results.get("forensicFindings", []),
        "notification": notification_results,
        "report": report_text,
    }

    # Persist best-effort
    try:
        record = build_persistence_record(
            cfg=cfg,
            source="text",
            filename=None,
            mime_type="text/plain",
            gcs_uri=None,
            extracted_text=request.document_text,
            analysis=response_payload,
        )
        firestore_id = store_analysis_in_firestore(cfg=cfg, record=record)
        warehouse_name = store_in_content_warehouse(
            cfg=cfg,
            display_name=f"AgentGuard analysis {uuid.uuid4()}",
            gs_uri=None,
            plain_text=request.document_text,
            filename=None,
            mime_type="text/plain",
        )
        if firestore_id:
            response_payload["firestoreId"] = firestore_id
        if warehouse_name:
            response_payload["warehouseDocumentName"] = warehouse_name
    except Exception:
        pass

    return response_payload


@app.post("/documents/analyze")
async def analyze_uploaded_document(file: UploadFile = File(...)):
    if not os.getenv("GOOGLE_API_KEY"):
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY is missing in the backend environment.")

    filename = file.filename or "uploaded"
    mime_type = file.content_type or "application/octet-stream"
    data = await file.read()

    gcs_uri = None
    try:
        gcs_uri = upload_to_gcs(cfg=cfg, filename=filename, content_type=mime_type, data=data)
    except Exception:
        gcs_uri = None

    extracted_text = ""
    if mime_type.startswith("text/"):
        extracted_text = data.decode("utf-8", errors="replace")
    else:
        if not cfg.project_id or not cfg.documentai_processor_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Document AI extraction is not configured for binary uploads. "
                    "Set GCP_PROJECT_ID + DOCUMENTAI_PROCESSOR_ID (and optionally DOCUMENTAI_LOCATION), "
                    "or upload a text file, or use /analyze with extracted text from the frontend."
                ),
            )
        extracted_text = extract_text_with_document_ai(cfg=cfg, mime_type=mime_type, data=data)

    audit_results = await analyze_financials(extracted_text, "N/A")
    high_risk = [a for a in audit_results.get("anomalies", []) if a.get("severity") == "high"]
    compliance_task = verify_compliance(audit_results)
    forensic_task = investigate_fraud(high_risk)
    compliance_results, forensic_results = await asyncio.gather(compliance_task, forensic_task)

    all_results = {"audit": audit_results, "compliance": compliance_results, "forensic": forensic_results}
    notification_task = decide_alerts(all_results)
    report_task = generate_audit_report(all_results)
    notification_results, report_text = await asyncio.gather(notification_task, report_task)

    response_payload = {
        "status": "success",
        "filename": filename,
        "mimeType": mime_type,
        "gcsUri": gcs_uri,
        "riskScore": audit_results.get("riskScore", 0),
        "totalTransactions": audit_results.get("totalTransactions", 0),
        "anomalies": audit_results.get("anomalies", []),
        "compliance": compliance_results.get("complianceIssues", []),
        "forensic": forensic_results.get("forensicFindings", []),
        "notification": notification_results,
        "report": report_text,
    }

    try:
        record = build_persistence_record(
            cfg=cfg,
            source="upload",
            filename=filename,
            mime_type=mime_type,
            gcs_uri=gcs_uri,
            extracted_text=extracted_text,
            analysis=response_payload,
        )
        firestore_id = store_analysis_in_firestore(cfg=cfg, record=record)
        warehouse_name = store_in_content_warehouse(
            cfg=cfg,
            display_name=filename,
            gs_uri=gcs_uri,
            plain_text=extracted_text,
            filename=filename,
            mime_type=mime_type,
        )
        if firestore_id:
            response_payload["firestoreId"] = firestore_id
        if warehouse_name:
            response_payload["warehouseDocumentName"] = warehouse_name
    except Exception:
        pass

    return response_payload


@app.get("/health")
def health_check():
    return {"status": "running"}


@app.get("/documents")
def list_documents(limit: int = 25):
    records = list_recent_firestore_records(cfg=cfg, limit=limit)
    if records is None:
        raise HTTPException(
            status_code=501,
            detail="Firestore listing is not configured. Set GCP_PROJECT_ID and ensure credentials are available.",
        )
    return {"items": records}


@app.get("/")
def root():
    return {"status": "running"}


@app.exception_handler(Exception)
async def _unhandled_exception_handler(_, exc: Exception):
    traceback.print_exc()
    return HTTPException(status_code=500, detail=f"Internal error: {str(exc)}")
