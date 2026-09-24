# dsh-wsl-ollama

> **Languages:** [中文（首页）](./README.md) · **English** (this file)

Local [Ollama](https://ollama.com) tools for DeepSeek Harness on WSL: `ollama_status` / `list` / `chat` / `embed`.

Optional kit companion — not in `install.sh`.

## Install

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-ollama
```

Default base: `http://127.0.0.1:11434` (`DSH_OLLAMA_BASE` / `OLLAMA_HOST`). Optional `DSH_OLLAMA_MODEL`.

If Ollama runs on **Windows** and dsh in **WSL**, `localhost` often 503 — listen on `0.0.0.0` or set `DSH_OLLAMA_BASE` to the Windows host IP (empty `baseUrl` may auto-detect via `/etc/resolv.conf`).

## Tools

| Tool | Role |
|------|------|
| `ollama_status` | Base URL, reachability, default model |
| `ollama_list` | Local models |
| `ollama_chat` | Local chat |
| `ollama_embed` | Embeddings |

## Compatibility

| Field | Value |
|-------|-------|
| **Plugin** | `dsh-wsl-ollama` **0.1.0** |
| **Minimum dsh** | ≥ **0.1.2** (web UI one-shot `?token=` on Windows relay `:3081`) |
| **Latest verified** | See [dsh-wsl-kit Compatibility](https://github.com/173787247/dsh-wsl-kit#compatibility-2026-09) (currently **`0.1.7-alpha.2`**) — single source of truth for the suite |
| **Kit set** | optional (not in `install.sh` / `KIT_SET=daily` by default) |

## License

MIT
