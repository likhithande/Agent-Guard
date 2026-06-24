from __future__ import annotations

import uuid
from dataclasses import asdict
from datetime import datetime, timezone

from google.api_core.client_options import ClientOptions

from .gcp_config import GcpConfig


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def upload_to_gcs(*, cfg: GcpConfig, filename: str, content_type: str | None, data: bytes) -> str | None:
    if not cfg.gcs_bucket:
        return None

    from google.cloud import storage

    client = storage.Client(project=cfg.project_id)
    bucket = client.bucket(cfg.gcs_bucket)

    object_name = f"uploads/{datetime.now(timezone.utc).strftime('%Y/%m/%d')}/{uuid.uuid4()}-{filename}"
    blob = bucket.blob(object_name)
    blob.upload_from_string(data, content_type=content_type)
    return f"gs://{cfg.gcs_bucket}/{object_name}"


def extract_text_with_document_ai(*, cfg: GcpConfig, mime_type: str, data: bytes) -> str:
    if not cfg.documentai_processor_id:
        raise RuntimeError("DOCUMENTAI_PROCESSOR_ID is not set")

    from google.cloud import documentai

    client = documentai.DocumentProcessorServiceClient(
        client_options=ClientOptions(api_endpoint=f"{cfg.documentai_location}-documentai.googleapis.com")
    )
    name = client.processor_path(cfg.project_id, cfg.documentai_location, cfg.documentai_processor_id)

    raw_document = documentai.RawDocument(content=data, mime_type=mime_type)
    request = documentai.ProcessRequest(name=name, raw_document=raw_document)
    result = client.process_document(request=request)

    document = result.document
    return document.text or ""


def store_in_content_warehouse(
    *,
    cfg: GcpConfig,
    display_name: str,
    gs_uri: str | None,
    plain_text: str | None,
    filename: str | None,
    mime_type: str | None,
) -> str | None:
    if not cfg.contentwarehouse_project_number:
        return None
    if not cfg.contentwarehouse_schema_name:
        # Warehouse documents require a schema; skip if not configured.
        return None

    from google.cloud import contentwarehouse_v1

    client = contentwarehouse_v1.DocumentServiceClient(
        client_options=ClientOptions(api_endpoint=f"{cfg.contentwarehouse_location}-contentwarehouse.googleapis.com")
    )
    parent = f"projects/{cfg.contentwarehouse_project_number}/locations/{cfg.contentwarehouse_location}"

    doc = contentwarehouse_v1.Document(
        display_name=display_name,
        document_schema_name=cfg.contentwarehouse_schema_name,
    )
    if plain_text:
        doc.plain_text = plain_text
    if gs_uri:
        doc.raw_document_path = gs_uri

    # Best-effort file type mapping for Warehouse.
    file_type = contentwarehouse_v1.RawDocumentFileType.RAW_DOCUMENT_FILE_TYPE_UNSPECIFIED
    name = (filename or "").lower()
    mt = (mime_type or "").lower()
    if name.endswith(".pdf") or mt == "application/pdf":
        file_type = contentwarehouse_v1.RawDocumentFileType.RAW_DOCUMENT_FILE_TYPE_PDF
    elif name.endswith(".docx") or mt in {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}:
        file_type = contentwarehouse_v1.RawDocumentFileType.RAW_DOCUMENT_FILE_TYPE_DOCX
    elif name.endswith(".xlsx") or mt in {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}:
        file_type = contentwarehouse_v1.RawDocumentFileType.RAW_DOCUMENT_FILE_TYPE_XLSX
    elif name.endswith(".pptx") or mt in {"application/vnd.openxmlformats-officedocument.presentationml.presentation"}:
        file_type = contentwarehouse_v1.RawDocumentFileType.RAW_DOCUMENT_FILE_TYPE_PPTX
    elif name.endswith(".tiff") or name.endswith(".tif") or mt in {"image/tiff"}:
        file_type = contentwarehouse_v1.RawDocumentFileType.RAW_DOCUMENT_FILE_TYPE_TIFF
    elif mt.startswith("text/"):
        file_type = contentwarehouse_v1.RawDocumentFileType.RAW_DOCUMENT_FILE_TYPE_TEXT
    doc.raw_document_file_type = file_type

    created = client.create_document(parent=parent, document=doc)
    return created.name


def store_analysis_in_firestore(*, cfg: GcpConfig, record: dict) -> str | None:
    if not cfg.project_id:
        return None

    from google.cloud import firestore

    client = firestore.Client(project=cfg.project_id)
    doc_ref = client.collection(cfg.firestore_collection).document()
    doc_ref.set({
        **record,
        "createdAt": utc_now_iso(),
    })
    return doc_ref.id


def list_recent_firestore_records(*, cfg: GcpConfig, limit: int = 25) -> list[dict] | None:
    if not cfg.project_id:
        return None

    from google.cloud import firestore

    client = firestore.Client(project=cfg.project_id)
    query = client.collection(cfg.firestore_collection).order_by("createdAt", direction=firestore.Query.DESCENDING).limit(limit)
    out: list[dict] = []
    for snap in query.stream():
        d = snap.to_dict() or {}
        d["id"] = snap.id
        out.append(d)
    return out


def build_persistence_record(
    *,
    cfg: GcpConfig,
    source: str,
    filename: str | None,
    mime_type: str | None,
    gcs_uri: str | None,
    extracted_text: str | None,
    analysis: dict,
) -> dict:
    # Keep payload small-ish for Firestore; store only a prefix of the extracted text.
    text_preview = None
    if extracted_text:
        text_preview = extracted_text[:20_000]

    return {
        "source": source,
        "filename": filename,
        "mimeType": mime_type,
        "gcsUri": gcs_uri,
        "textPreview": text_preview,
        "analysis": analysis,
        "cfg": {
            # Non-secret config snapshot (never persist API keys)
            **{k: v for k, v in asdict(cfg).items() if k != "google_api_key"},
        },
    }
