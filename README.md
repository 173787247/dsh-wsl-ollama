# dsh-wsl-ollama

> **语言：** **中文**（本页） · [English](./README.en.md)

在 WSL 上给 DeepSeek Harness 接本地 [Ollama](https://ollama.com)：`ollama_status` / `list` / `chat` / `embed`。

可选插件，**不在** `install.sh`。

## 最短上手

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-ollama
# 或本机 path 链进 web profile 后 restart
```

Ollama 需已在跑。默认基址 `http://127.0.0.1:11434`。

若 Ollama 装在 **Windows**、dsh 在 **WSL**：`localhost` 常会 503。可：

- 让 Ollama 监听 `0.0.0.0:11434`，或
- 设 `DSH_OLLAMA_BASE=http://<Windows主机IP>:11434`（插件也可在 `baseUrl` 为空时尝试从 `/etc/resolv.conf` 推主机）

## 工具

| 工具 | 作用 |
|------|------|
| `ollama_status` | 基址、连通性、默认模型 |
| `ollama_list` | 已拉取模型列表 |
| `ollama_chat` | 本地对话 |
| `ollama_embed` | 向量（给 vecmem 等用） |

## 配置

```yaml
config:
  enabled: true
  baseUrl: ""              # 空 = 自动探测
  defaultModel: ""         # 或环境变量 DSH_OLLAMA_MODEL
  timeoutMs: 120000
  maxPromptChars: 32000
```

环境变量：`DSH_OLLAMA_BASE` / `OLLAMA_HOST`、`DSH_OLLAMA_MODEL`。

## License

MIT
