import { createOllamaClient } from "./lib/client.js";

export const name = "dsh-wsl-ollama";
export const inject = ["tools", "systemPrompt"];

export function apply(ctx, config = {}) {
  if (config.enabled === false) {
    console.log("[dsh-wsl-ollama] disabled");
    return;
  }
  const client = createOllamaClient({
    baseUrl: config.baseUrl || process.env.DSH_OLLAMA_BASE || process.env.OLLAMA_HOST || "http://127.0.0.1:11434",
    defaultModel: config.defaultModel || process.env.DSH_OLLAMA_MODEL || "",
    timeoutMs: positive(config.timeoutMs, 120_000),
    maxPromptChars: positive(config.maxPromptChars, 32_000),
  });
  console.log(`[dsh-wsl-ollama] base=${client.root} defaultModel=${client.defaultModel || "(none)"}`);

  ctx.systemPrompt.section({
    name: "tool:ollama",
    order: 128,
    text: "dsh-wsl-ollama talks to a local Ollama daemon (default http://127.0.0.1:11434). Use ollama_status/list before chat. Prefer local models for offline or private prompts; cloud Flash stays the default agent brain unless you choose otherwise.",
  });

  const timeoutMs = client.timeoutMs;

  ctx.tools.register({
    name: "ollama_status",
    description: "Check whether local Ollama is reachable and list known default model.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
    output: { schema: { type: "object", additionalProperties: true }, render: (_a, v) => [{ type: "text", text: JSON.stringify(v, null, 2) }] },
    timeoutMs: 15_000,
    isConcurrencySafe: () => true,
    async execute() {
      return client.status();
    },
    presentCall: () => ({ card: "generic", title: "Ollama status" }),
    presentResult: (_a, r) => ({ card: "generic", title: "Ollama status", content: r.content }),
  });

  ctx.tools.register({
    name: "ollama_list",
    description: "List models installed in local Ollama.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
    output: { schema: { type: "object", additionalProperties: true }, render: (_a, v) => [{ type: "text", text: formatList(v) }] },
    timeoutMs: 30_000,
    isConcurrencySafe: () => true,
    async execute() {
      try {
        return await client.list();
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    presentCall: () => ({ card: "generic", title: "Ollama list" }),
    presentResult: (_a, r) => ({ card: "generic", title: "Ollama list", content: r.content }),
  });

  ctx.tools.register({
    name: "ollama_chat",
    description: "Non-streaming chat against a local Ollama model. Provide model + prompt (or messages).",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        model: { type: "string" },
        prompt: { type: "string" },
        system: { type: "string" },
        messages: {
          type: "array",
          items: {
            type: "object",
            properties: { role: { type: "string" }, content: { type: "string" } },
          },
        },
      },
    },
    output: { schema: { type: "object", additionalProperties: true }, render: (_a, v) => [{ type: "text", text: v.ok === false ? `FAIL: ${v.error}` : String(v.message || "") }] },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      try {
        return await client.chat(args || {});
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    presentCall: () => ({ card: "generic", title: "Ollama chat" }),
    presentResult: (_a, r) => ({ card: "generic", title: "Ollama chat", content: r.content }),
  });

  ctx.tools.register({
    name: "ollama_embed",
    description: "Embed text with a local Ollama embedding-capable model. Returns dims + embedding vector.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["input"],
      properties: {
        model: { type: "string", description: "Embedding model name" },
        input: { type: "string" },
      },
    },
    output: {
      schema: { type: "object", additionalProperties: true },
      render: (_a, v) => [
        {
          type: "text",
          text: v.ok === false ? `FAIL: ${v.error}` : `dims=${v.dims} model=${v.model} (embedding omitted in render)`,
        },
      ],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      try {
        return await client.embed(args || {});
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    presentCall: () => ({ card: "generic", title: "Ollama embed" }),
    presentResult: (_a, r) => ({ card: "generic", title: "Ollama embed", content: r.content }),
  });
}

function formatList(v) {
  if (!v?.ok) return `FAIL: ${v?.error}`;
  const names = (v.models || []).map((m) => m.name);
  return [`ollama_list OK count=${names.length}`, ...names.map((n) => `- ${n}`)].join("\n");
}

function positive(v, fb) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fb;
}
