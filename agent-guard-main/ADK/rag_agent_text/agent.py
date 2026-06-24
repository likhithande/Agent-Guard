"""ADK root agent definition for the rag_agent_text app.

This app reuses the same local RAG tools/corpora implementation as `rag_agent`,
but pins a higher-quality text model. Use this for normal chat (/run, /run_sse).

Note: ADK Dev UI Live mode (audio) uses v1alpha bidiGenerateContent. The model
below is intended for text generation; for audio/live use the `rag_agent` app.
"""

from __future__ import annotations

from pathlib import Path

from google.adk import Agent


def _load_shared_env() -> None:
    # `adk` loads per-app .env automatically. Since we don't want to duplicate
    # secrets into a second .env file, we best-effort load the existing one.
    try:
        from dotenv import load_dotenv

        root = Path(__file__).resolve().parent
        shared_env = root.parent / "rag_agent" / ".env"
        if shared_env.exists():
            load_dotenv(shared_env, override=False)
    except Exception:
        # If python-dotenv isn't available or any other issue occurs,
        # rely on environment variables already exported in the shell.
        return


_load_shared_env()

# Reuse the same tool functions and indexing implementation.
from rag_agent.agent import (  # noqa: E402
    add_data,
    create_corpus,
    delete_corpus,
    delete_document,
    get_corpus_info,
    list_corpora,
    rag_query,
    rag_reindex,
    rag_reindex_corpus,
    rag_search,
)


root_agent = Agent(
    name="rag_agent_text",
    model="gemini-3-pro-preview",
    instruction=(
        "You are a retrieval-augmented assistant for this repository. "
        "Use the `rag_search` tool to look up relevant file snippets before answering. "
        "Cite the file paths you used in plain text. "
        "If the retrieved context is insufficient, say what is missing and suggest what file to check."
    ),
    tools=[
        rag_query,
        list_corpora,
        create_corpus,
        add_data,
        get_corpus_info,
        delete_corpus,
        delete_document,
        rag_search,
        rag_reindex,
        rag_reindex_corpus,
    ],
)
