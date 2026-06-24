from __future__ import annotations

import argparse
from pathlib import Path

from .fs_index import index_folder, search
from .genai_client import generate_answer


def _build_context(rows) -> str:
    parts: list[str] = []
    for r in rows:
        parts.append(f"---\nFILE: {r['path']}\nCHUNK: {r['chunk_index']}\n\n{r['content']}\n")
    return "\n".join(parts)


def cmd_index(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    files, chunks = index_folder(root)
    print(f"Indexed {files} file(s), {chunks} chunk(s) into {root / '.rag-index.sqlite'}")
    return 0


def cmd_chat(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()

    def ask_once(q: str) -> None:
        rows = search(root, q, limit=args.k)
        context = _build_context(rows)
        if not rows:
            print("No relevant context found in index. Try re-indexing or rephrasing.")
            return
        try:
            answer = generate_answer(question=q, context=context)
        except RuntimeError as e:
            print(str(e))
            return
        print(answer)

    if args.interactive:
        print("Interactive chat. Type 'exit' to quit.")
        while True:
            q = input("\n> ").strip()
            if not q:
                continue
            if q.lower() in {"exit", "quit"}:
                break
            ask_once(q)
        return 0

    if not args.question:
        raise SystemExit("Provide a question or use --interactive")

    ask_once(args.question)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="rag_agent")
    parser.add_argument(
        "--root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Folder to index/search (default: rag-agent folder)",
    )

    sub = parser.add_subparsers(dest="cmd", required=True)

    p_index = sub.add_parser("index", help="Index all files under --root")
    p_index.set_defaults(func=cmd_index)

    p_chat = sub.add_parser("chat", help="Ask a question using retrieved file context")
    p_chat.add_argument("question", nargs="?", help="Question to ask")
    p_chat.add_argument("--k", type=int, default=8, help="How many chunks to retrieve")
    p_chat.add_argument("--interactive", action="store_true", help="Run interactive mode")
    p_chat.set_defaults(func=cmd_chat)

    args = parser.parse_args(argv)
    try:
        return int(args.func(args))
    except BrokenPipeError:
        # Allow piping output (e.g., to `head`) without noisy tracebacks.
        return 0
