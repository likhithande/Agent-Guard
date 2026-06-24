from __future__ import annotations

import os
import re
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, Sequence


DEFAULT_DB_NAME = ".rag-index.sqlite"


DEFAULT_EXCLUDE_DIRS = {
    ".git",
    ".venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
}

DEFAULT_EXCLUDE_FILES = {
    DEFAULT_DB_NAME,
    ".DS_Store",
}


_TEXT_FILE_EXTENSIONS = {
    ".md",
    ".txt",
    ".py",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".cfg",
    ".env",
    ".sh",
    ".bat",
    ".ps1",
    ".sql",
    ".csv",
    ".ts",
    ".js",
    ".java",
    ".go",
    ".rs",
    ".html",
    ".css",
}


def _read_pdf_text(path: Path) -> str | None:
    """Best-effort PDF text extraction.

    Returns:
      - str (possibly empty) if extraction ran
      - None if the file could not be read / no extractor available
    """
    # 1) Prefer pure-Python extraction if available.
    try:
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(str(path))
        parts: list[str] = []
        for page in reader.pages:
            try:
                text = page.extract_text() or ""
            except Exception:
                text = ""
            if text:
                parts.append(text)
        return "\n\n".join(parts)
    except ImportError:
        pass
    except Exception:
        # If pypdf is installed but parsing fails, fall through to pdftotext.
        pass

    # 2) Fallback to the system 'pdftotext' tool if installed (poppler).
    try:
        import subprocess

        proc = subprocess.run(
            ["pdftotext", "-layout", str(path), "-"],
            check=False,
            capture_output=True,
            text=True,
        )
        if proc.returncode == 0:
            return proc.stdout
    except Exception:
        return None

    return None


@dataclass(frozen=True)
class Chunk:
    path: str
    chunk_index: int
    content: str


def iter_files(root: Path) -> Iterator[Path]:
    root = root.resolve()
    for dirpath, dirnames, filenames in os.walk(root):
        dir_path = Path(dirpath)
        dirnames[:] = [
            d
            for d in dirnames
            if d not in DEFAULT_EXCLUDE_DIRS and not d.startswith(".")
        ]
        for name in filenames:
            if name in DEFAULT_EXCLUDE_FILES:
                continue
            if name.startswith("."):
                continue
            path = dir_path / name
            if path.is_symlink():
                continue
            yield path


def _looks_binary(sample: bytes) -> bool:
    if not sample:
        return False
    if b"\x00" in sample:
        return True
    # Heuristic: if too many non-printable bytes, treat as binary.
    text = bytearray({7, 8, 9, 10, 12, 13, 27} | set(range(0x20, 0x100)))
    nontext = sample.translate(None, text)
    return float(len(nontext)) / float(len(sample)) > 0.30


def read_text_file(path: Path, max_bytes: int = 2_000_000) -> str | None:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _read_pdf_text(path)
    if suffix and suffix not in _TEXT_FILE_EXTENSIONS:
        return None

    try:
        with path.open("rb") as f:
            sample = f.read(8192)
            if _looks_binary(sample):
                return None
            rest = f.read(max_bytes - len(sample))
            data = sample + rest
    except OSError:
        return None

    # Keep it dependency-free: best-effort decode.
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("utf-8", errors="ignore")


def chunk_text(text: str, *, max_chars: int = 1200, overlap: int = 150) -> list[str]:
    text = text.replace("\r\n", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        return []

    paragraphs = re.split(r"\n\n+", text)
    chunks: list[str] = []
    buf: list[str] = []
    buf_len = 0

    def flush() -> None:
        nonlocal buf, buf_len
        if not buf:
            return
        chunk = "\n\n".join(buf).strip()
        if chunk:
            chunks.append(chunk)
        buf = []
        buf_len = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        # If a single paragraph is huge, hard-split it.
        if len(para) > max_chars:
            flush()
            start = 0
            while start < len(para):
                end = min(len(para), start + max_chars)
                chunks.append(para[start:end])
                start = max(0, end - overlap)
            continue

        extra = len(para) + (2 if buf else 0)
        if buf_len + extra > max_chars:
            flush()
        buf.append(para)
        buf_len += len(para) + (2 if len(buf) > 1 else 0)

    flush()
    return chunks


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS files (
            path TEXT PRIMARY KEY,
            mtime REAL NOT NULL,
            size INTEGER NOT NULL,
            indexed_at REAL NOT NULL
        );
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL
        );
        """
    )
    # FTS5 is built into modern SQLite builds on macOS.
    conn.execute(
        """
        CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts
        USING fts5(content, path, chunk_id UNINDEXED, tokenize='porter unicode61');
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_path ON chunks(path);")


def needs_reindex(conn: sqlite3.Connection, *, rel_path: str, mtime: float, size: int) -> bool:
    row = conn.execute(
        "SELECT mtime, size FROM files WHERE path = ?;",
        (rel_path,),
    ).fetchone()
    if row is None:
        return True
    return float(row["mtime"]) != float(mtime) or int(row["size"]) != int(size)


def remove_file(conn: sqlite3.Connection, *, rel_path: str) -> None:
    ids = [r[0] for r in conn.execute("SELECT id FROM chunks WHERE path = ?;", (rel_path,))]
    if ids:
        conn.executemany("DELETE FROM chunks_fts WHERE chunk_id = ?;", [(i,) for i in ids])
        conn.execute("DELETE FROM chunks WHERE path = ?;", (rel_path,))
    conn.execute("DELETE FROM files WHERE path = ?;", (rel_path,))


def index_folder(root: Path, *, db_path: Path | None = None) -> tuple[int, int]:
    root = root.resolve()
    if db_path is None:
        db_path = root / DEFAULT_DB_NAME

    conn = connect(db_path)
    try:
        init_db(conn)

        indexed_files = 0
        indexed_chunks = 0

        # Remove entries for deleted files.
        existing = {r[0] for r in conn.execute("SELECT path FROM files;").fetchall()}
        current = {str(p.relative_to(root)).replace(os.sep, "/") for p in iter_files(root)}
        deleted = sorted(existing - current)
        for rel_path in deleted:
            remove_file(conn, rel_path=rel_path)

        for abs_path in iter_files(root):
            rel_path = str(abs_path.relative_to(root)).replace(os.sep, "/")
            try:
                stat = abs_path.stat()
            except OSError:
                continue

            if not needs_reindex(conn, rel_path=rel_path, mtime=stat.st_mtime, size=stat.st_size):
                continue

            text = read_text_file(abs_path)
            if text is None:
                continue

            chunks = chunk_text(text)
            if not chunks:
                continue

            # Replace per-file chunks.
            remove_file(conn, rel_path=rel_path)

            now = time.time()
            conn.execute(
                "INSERT OR REPLACE INTO files(path, mtime, size, indexed_at) VALUES (?, ?, ?, ?);",
                (rel_path, float(stat.st_mtime), int(stat.st_size), float(now)),
            )

            for idx, content in enumerate(chunks):
                cur = conn.execute(
                    "INSERT INTO chunks(path, chunk_index, content) VALUES (?, ?, ?);",
                    (rel_path, idx, content),
                )
                chunk_id = int(cur.lastrowid)
                conn.execute(
                    "INSERT INTO chunks_fts(content, path, chunk_id) VALUES (?, ?, ?);",
                    (content, rel_path, chunk_id),
                )
                indexed_chunks += 1

            indexed_files += 1

        conn.commit()
        return indexed_files, indexed_chunks
    finally:
        conn.close()


def _fts_query_from_text(text: str) -> str:
    # Keep it simple + safe: extract alnum-ish tokens and OR them.
    tokens = re.findall(r"[A-Za-z0-9_./-]{2,}", text)
    tokens = tokens[:20]
    if not tokens:
        return ""
    return " OR ".join(tokens)


def search(
    root: Path,
    question: str,
    *,
    db_path: Path | None = None,
    limit: int = 8,
) -> list[sqlite3.Row]:
    root = root.resolve()
    if db_path is None:
        db_path = root / DEFAULT_DB_NAME

    if not db_path.exists():
        raise FileNotFoundError(f"Index database not found: {db_path}. Run 'python -m rag_agent index' first.")

    fts_query = _fts_query_from_text(question)
    if not fts_query:
        return []

    conn = connect(db_path)
    try:
        return conn.execute(
            """
            SELECT c.id AS chunk_id, c.path, c.chunk_index, c.content, bm25(chunks_fts) AS score
            FROM chunks_fts
            JOIN chunks c ON c.id = chunks_fts.chunk_id
            WHERE chunks_fts MATCH ?
            ORDER BY score
            LIMIT ?;
            """,
            (fts_query, int(limit)),
        ).fetchall()
    finally:
        conn.close()
