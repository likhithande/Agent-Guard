# ADK agents directory (recommended)

This folder exists to make ADK Dev UI reliable:

- ADK treats **every** subfolder as an "app".
- The repo root contains folders (e.g. `google-cloud-sdk/`) that are **not** ADK apps.
- Pointing `adk web` at the repo root can make it easy to select the wrong app in the UI.

## Run

From the repo root:

```bash
./.venv/bin/adk web --log_to_tmp --log_level DEBUG adk_agents
```

Then open:

- http://localhost:8000/dev-ui

You should only see one app in the UI: `rag_agent`.
