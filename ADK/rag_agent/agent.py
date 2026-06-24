"""ADK root agent definition for the rag_agent app.

ADK's Dev UI expects a top-level `root_agent` object exposed from one of:
- `rag_agent.agent.root_agent` (this file)
- `rag_agent.root_agent`
- `rag_agent/root_agent.yaml`
"""

import os
import re
import shutil
from pathlib import Path

from google.adk import Agent

from .fs_index import index_folder, search


_ROOT = Path(__file__).resolve().parent
_WORKSPACE_ROOT = _ROOT.parent
_CORPORA_DIR = _ROOT / ".corpora"


def _load_env() -> None:
    """Load per-app environment variables.

    ADK Dev UI imports this module to discover `root_agent`. We load the local
    `.env` so `GOOGLE_API_KEY` (or Vertex settings) are available before ADK
    initializes any Gemini connections.
    """

    try:
        from dotenv import load_dotenv

        load_dotenv(dotenv_path=_ROOT / ".env", override=False)
    except Exception:
        # If python-dotenv isn't available (or any other issue occurs), rely on
        # environment variables already exported in the shell.
        return


def _ensure_genai_configured() -> None:
    def _truthy_env(name: str) -> bool:
        raw = os.getenv(name)
        if raw is None:
            return False
        v = raw.strip().strip('"').strip("'").lower()
        return v in {"1", "true", "t", "yes", "y", "on"}

    use_vertex = _truthy_env("GOOGLE_GENAI_USE_VERTEXAI")

    raw_key = os.getenv("GOOGLE_API_KEY")
    api_key = (raw_key or "").strip().strip('"').strip("'") or None
    project = (os.getenv("GOOGLE_CLOUD_PROJECT") or "").strip().strip('"').strip("'") or None

    if use_vertex:
        if api_key:
            raise RuntimeError(
                "GOOGLE_GENAI_USE_VERTEXAI=true enables Vertex AI, which does NOT support API keys. "
                "Either set GOOGLE_GENAI_USE_VERTEXAI=0 to use the Gemini API with GOOGLE_API_KEY, "
                "or remove GOOGLE_API_KEY and configure ADC + GOOGLE_CLOUD_PROJECT (and GOOGLE_CLOUD_LOCATION)."
            )
        if project:
            return
        raise RuntimeError(
            "Vertex AI mode is enabled (GOOGLE_GENAI_USE_VERTEXAI=true) but GOOGLE_CLOUD_PROJECT is not set. "
            "Set GOOGLE_CLOUD_PROJECT (and optionally GOOGLE_CLOUD_LOCATION) and authenticate with ADC."
        )

    if api_key:
        return

    if project:
        return

    raise RuntimeError(
        "Gemini is not configured. Set GOOGLE_API_KEY (Gemini API key mode) in ADK/rag_agent/.env or your shell. "
        "Alternatively, set GOOGLE_GENAI_USE_VERTEXAI=true + GOOGLE_CLOUD_PROJECT (and optionally GOOGLE_CLOUD_LOCATION) "
        "to use Vertex AI with Application Default Credentials."
    )


_load_env()
_ensure_genai_configured()


def _validate_corpus_name(corpus_name: str) -> str:
    corpus_name = (corpus_name or "").strip()
    if not corpus_name:
        raise ValueError("corpus_name is required")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}", corpus_name):
        raise ValueError(
            "Invalid corpus_name. Use 1-64 chars: letters, digits, '.', '_', '-'."
        )
    return corpus_name


def _corpus_root(corpus_name: str) -> Path:
    return _CORPORA_DIR / _validate_corpus_name(corpus_name)


def _corpus_data_dir(corpus_name: str) -> Path:
    return _corpus_root(corpus_name) / "data"


def _ensure_corpus_dirs(corpus_name: str) -> tuple[Path, Path]:
    root = _corpus_root(corpus_name)
    data_dir = root / "data"
    root.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)
    return root, data_dir


def _build_context(rows) -> str:
    parts: list[str] = []
    for r in rows:
        parts.append(
            f"---\nFILE: {r['path']}\nCHUNK: {r['chunk_index']}\n\n{r['content']}\n"
        )
    return "\n".join(parts)


def rag_reindex() -> str:
    """Re-index all files under the rag_agent folder for retrieval."""
    files, chunks = index_folder(_ROOT)
    return f"Indexed {files} file(s), {chunks} chunk(s)."


def rag_reindex_corpus(corpus_name: str) -> str:
    """Re-index a named corpus under rag_agent/.corpora/<name>/data."""
    root, data_dir = _ensure_corpus_dirs(corpus_name)
    db_path = root / ".rag-index.sqlite"
    files, chunks = index_folder(data_dir, db_path=db_path)
    return (
        f"Corpus '{corpus_name}' indexed: {files} file(s) updated, {chunks} chunk(s) added."
    )


def rag_search(query: str, k: int = 8, corpus_name: str = "") -> str:
    """Search the local rag_agent folder and return the most relevant snippets.

    Args:
      query: Natural language question or keywords.
      k: Number of chunks to return.
    """
    corpus_name = (corpus_name or "").strip()
    if corpus_name:
        root, data_dir = _ensure_corpus_dirs(corpus_name)
        db_path = root / ".rag-index.sqlite"
        if not db_path.exists():
            index_folder(data_dir, db_path=db_path)
        rows = search(data_dir, query, db_path=db_path, limit=int(k))
        if not rows:
            return f"No relevant context found in corpus '{corpus_name}'."
        # Prefix the returned path with corpus name for clarity.
        parts: list[str] = []
        for r in rows:
            parts.append(
                f"---\nFILE: {corpus_name}/{r['path']}\nCHUNK: {r['chunk_index']}\n\n{r['content']}\n"
            )
        return "\n".join(parts)

    # Default corpus = this rag_agent folder.
    db_path = _ROOT / ".rag-index.sqlite"
    if not db_path.exists():
        index_folder(_ROOT)

    rows = search(_ROOT, query, limit=int(k))
    if not rows:
        return "No relevant context found in the local index."
    return _build_context(rows)


def rag_query(question: str, corpus_name: str = "", k: int = 8) -> str:
    """RAG helper that returns retrieved context for a question.

    The LLM will use this returned context to produce the final answer.
    """
    return rag_search(question, k=k, corpus_name=corpus_name)


def list_corpora() -> str:
    """List available local corpora under rag_agent/.corpora."""
    if not _CORPORA_DIR.exists():
        return "No corpora found. Create one with create_corpus(corpus_name)."
    corpora = sorted(
        [p.name for p in _CORPORA_DIR.iterdir() if p.is_dir() and not p.name.startswith(".")]
    )
    if not corpora:
        return "No corpora found. Create one with create_corpus(corpus_name)."
    return "Available corpora:\n- " + "\n- ".join(corpora)


def create_corpus(corpus_name: str) -> str:
    """Create a new local corpus directory."""
    root, data_dir = _ensure_corpus_dirs(corpus_name)
    db_path = root / ".rag-index.sqlite"
    if not db_path.exists():
        # Initialize empty index.
        index_folder(data_dir, db_path=db_path)
    return f"Created corpus '{corpus_name}' at {root}."


def add_data(corpus_name: str, path: str) -> str:
    """Add a file or directory into a corpus (copies into corpus data folder), then re-index."""
    if not path:
        raise ValueError("path is required")
    root, data_dir = _ensure_corpus_dirs(corpus_name)
    src = Path(path)
    if not src.is_absolute():
        src = (_WORKSPACE_ROOT / src).resolve()

    if not src.exists():
        raise FileNotFoundError(f"Path not found: {src}")

    # Copy into corpus data dir. Use basename to avoid surprising layout.
    dest = data_dir / src.name
    if src.is_dir():
        shutil.copytree(
            src,
            dest,
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns(".git", ".venv", "__pycache__", ".pytest_cache", ".mypy_cache"),
        )
    else:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)

    db_path = root / ".rag-index.sqlite"
    files, chunks = index_folder(data_dir, db_path=db_path)
    return (
        f"Added '{src}' to corpus '{corpus_name}' (stored as {dest}). "
        f"Indexed {files} file(s), {chunks} chunk(s)."
    )


def get_corpus_info(corpus_name: str) -> str:
    """Return basic info for a corpus."""
    root = _corpus_root(corpus_name)
    data_dir = root / "data"
    db_path = root / ".rag-index.sqlite"
    if not root.exists():
        return f"Corpus '{corpus_name}' does not exist."

    file_count = 0
    chunk_count = 0
    if db_path.exists():
        import sqlite3

        conn = sqlite3.connect(str(db_path))
        try:
            file_count = int(conn.execute("SELECT COUNT(*) FROM files;").fetchone()[0])
            chunk_count = int(conn.execute("SELECT COUNT(*) FROM chunks;").fetchone()[0])
        except Exception:
            # If schema is incompatible, surface that clearly.
            return (
                f"Corpus '{corpus_name}' exists but index schema looks incompatible. "
                f"Run rag_reindex_corpus('{corpus_name}')."
            )
        finally:
            conn.close()

    disk_files = 0
    if data_dir.exists():
        disk_files = sum(1 for _ in data_dir.rglob("*") if _.is_file())

    return (
        f"Corpus '{corpus_name}':\n"
        f"- path: {root}\n"
        f"- data files on disk: {disk_files}\n"
        f"- indexed files: {file_count}\n"
        f"- indexed chunks: {chunk_count}"
    )


def delete_document(corpus_name: str, document_path: str) -> str:
    """Delete a document from a corpus and re-index.

    document_path should be a relative path as shown in search results (without the corpus prefix).
    """
    if not document_path:
        raise ValueError("document_path is required")
    root, data_dir = _ensure_corpus_dirs(corpus_name)
    target = (data_dir / document_path).resolve()
    if data_dir.resolve() not in target.parents and target != data_dir.resolve():
        raise ValueError("document_path must stay within the corpus data directory")

    if not target.exists():
        return f"Document not found in corpus '{corpus_name}': {document_path}"

    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()

    db_path = root / ".rag-index.sqlite"
    files, chunks = index_folder(data_dir, db_path=db_path)
    return (
        f"Deleted '{document_path}' from corpus '{corpus_name}'. "
        f"Re-indexed {files} file(s), {chunks} chunk(s)."
    )


def delete_corpus(corpus_name: str) -> str:
    """Delete an entire corpus (data + index)."""
    root = _corpus_root(corpus_name)
    if not root.exists():
        return f"Corpus '{corpus_name}' does not exist."
    shutil.rmtree(root)
    return f"Deleted corpus '{corpus_name}'."


root_agent = Agent(
    name="rag_agent",
    # Live (audio input) in ADK Dev UI uses the v1alpha bidiGenerateContent API.
    # This model is available for your API key and supports that Live method.
    model="gemini-2.0-flash-exp",
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