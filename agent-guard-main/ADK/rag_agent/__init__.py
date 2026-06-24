"""Local-folder RAG helper (SQLite FTS + Gemini).

This package is intentionally dependency-light:
- Uses stdlib `sqlite3` FTS5 for retrieval
- Uses `google-genai` for generation

Entry points:
- `python -m rag_agent index`
- `python -m rag_agent chat "..."`
"""

from .cli import main

# Make ADK discovery resilient: some loaders access attributes on the package
# module without importing submodules first.
from . import agent as agent  # noqa: F401

__all__ = ["main", "agent"]
