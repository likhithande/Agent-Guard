from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class GcpConfig:
    # Generative Language API (Gemini Developer API)
    google_api_key: str | None

    # Common GCP
    project_id: str | None
    location: str

    # Google Cloud Storage
    gcs_bucket: str | None

    # Document AI (for OCR/extraction)
    documentai_processor_id: str | None
    documentai_location: str

    # Document AI Warehouse (Content Warehouse)
    contentwarehouse_project_number: str | None
    contentwarehouse_location: str
    contentwarehouse_schema_name: str | None

    # Firestore
    firestore_collection: str


def load_gcp_config() -> GcpConfig:
    return GcpConfig(
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        project_id=os.getenv("GCP_PROJECT_ID"),
        location=os.getenv("GCP_LOCATION", "us"),
        gcs_bucket=os.getenv("GCS_BUCKET"),
        documentai_processor_id=os.getenv("DOCUMENTAI_PROCESSOR_ID"),
        documentai_location=os.getenv("DOCUMENTAI_LOCATION", os.getenv("GCP_LOCATION", "us")),
        contentwarehouse_project_number=os.getenv("CONTENTWAREHOUSE_PROJECT_NUMBER"),
        contentwarehouse_location=os.getenv("CONTENTWAREHOUSE_LOCATION", os.getenv("GCP_LOCATION", "us")),
        contentwarehouse_schema_name=os.getenv("CONTENTWAREHOUSE_DOCUMENT_SCHEMA_NAME"),
        firestore_collection=os.getenv("FIRESTORE_COLLECTION", "audit_documents"),
    )
