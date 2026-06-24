"""Text-only (high quality) variant of the RAG agent.

This app is intended to be selected in ADK Dev UI when you want best quality
text responses (non-Live), while `rag_agent` is configured for Live/audio.
"""

# Make ADK discovery resilient: some loaders access attributes on the package
# module without importing submodules first.
from . import agent as agent  # noqa: F401

__all__ = ["agent"]
