from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class GenAIConfig:
    model: str
    api_key: str | None
    project: str | None
    location: str


def load_config() -> GenAIConfig:
    # Best-effort load local .env for CLI usage.
    try:
        from dotenv import load_dotenv

        load_dotenv(dotenv_path=Path(__file__).with_name(".env"), override=False)
    except Exception:
        pass

    def _clean_env(name: str) -> str | None:
        raw = os.getenv(name)
        if raw is None:
            return None
        v = raw.strip().strip('"').strip("'")
        return v or None

    model = _clean_env("GENAI_MODEL") or "gemini-1.5-flash"
    api_key = _clean_env("GOOGLE_API_KEY")
    project = _clean_env("GOOGLE_CLOUD_PROJECT")
    location = _clean_env("GOOGLE_CLOUD_LOCATION") or "us-central1"
    return GenAIConfig(model=model, api_key=api_key, project=project, location=location)


def make_client():
    # google-genai
    from google import genai

    cfg = load_config()
    use_vertex = (os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "0") or "0").strip().strip('"').strip("'").lower() in {
        "1",
        "true",
        "t",
        "yes",
        "y",
        "on",
    }

    if use_vertex:
        if cfg.api_key:
            raise RuntimeError(
                "GOOGLE_GENAI_USE_VERTEXAI=true enables Vertex AI, which does NOT support API keys. "
                "Set GOOGLE_GENAI_USE_VERTEXAI=0 to use GOOGLE_API_KEY, or configure ADC + GOOGLE_CLOUD_PROJECT."
            )
        if not cfg.project:
            raise RuntimeError(
                "Vertex AI mode is enabled (GOOGLE_GENAI_USE_VERTEXAI=true) but GOOGLE_CLOUD_PROJECT is not set."
            )
        return genai.Client(vertexai=True, project=cfg.project, location=cfg.location), cfg

    if cfg.api_key:
        return genai.Client(api_key=cfg.api_key), cfg

    if cfg.project:
        # Allow Vertex mode implicitly if project is present.
        return genai.Client(vertexai=True, project=cfg.project, location=cfg.location), cfg

    raise RuntimeError(
        "Gemini is not configured. Set either GOOGLE_API_KEY (API key mode) "
        "or GOOGLE_CLOUD_PROJECT (Vertex mode with ADC)."
    )


def generate_answer(*, question: str, context: str) -> str:
    client, cfg = make_client()

    prompt = (
        "You are a helpful assistant. Use ONLY the provided context to answer. "
        "If the context is insufficient, say what is missing.\n\n"
        "CONTEXT:\n"
        f"{context}\n\n"
        "QUESTION:\n"
        f"{question}\n"
    )

    try:
        resp = client.models.generate_content(model=cfg.model, contents=prompt)
    except Exception as e:
        msg = str(e)
        haystack = msg.lower()
        if (
            "api key expired" in haystack
            or "api_key_invalid" in haystack
            or "api key invalid" in haystack
            or "generativelanguage.googleapis.com" in haystack and "invalid_argument" in haystack
        ):
            raise RuntimeError(
                "Gemini API key is invalid or expired. Renew it in AI Studio and set GOOGLE_API_KEY, then retry."
            ) from e
        raise
    text = getattr(resp, "text", None)
    if isinstance(text, str) and text.strip():
        return text.strip()

    # Fallback for response shapes.
    return str(resp)
