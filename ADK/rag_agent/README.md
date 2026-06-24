# rag-agent

A minimal Retrieval-Augmented Generation (RAG) helper that indexes *all* files under this `rag-agent/` folder into a local SQLite Full-Text Search (FTS5) database, then answers questions by retrieving relevant chunks and sending them to Gemini via `google-genai`.

## Setup

Use the repo venv (recommended):

- Create/activate venv (if not already):
  - `python -m venv .venv`
  - `source .venv/bin/activate`
- Install deps from repo root:
  - `python -m pip install -r ../requirements.txt`

## Configure Gemini

Either:

- API key mode: set `GOOGLE_API_KEY`

or

- Vertex AI mode (ADC): set `GOOGLE_CLOUD_PROJECT` and optionally `GOOGLE_CLOUD_LOCATION` (defaults to `us-central1`), and make sure `gcloud auth application-default login` is done.

Optional:

- `GENAI_MODEL` (default: `gemini-1.5-flash`)

## Index this folder

Recommended: run from `rag-agent/`:

- `python -m rag_agent index`

Alternative (from repo root) if you don't want to `cd`:

- `PYTHONPATH=rag-agent python -m rag_agent index`

This creates `rag-agent/.rag-index.sqlite`.

## Ask questions

Recommended: run from `rag-agent/`:

- `python -m rag_agent chat "What does this folder do?"`

Alternative (from repo root):

- `PYTHONPATH=rag-agent python -m rag_agent chat "What does this folder do?"`

You can also run interactive mode:

- `python -m rag_agent chat --interactive`
