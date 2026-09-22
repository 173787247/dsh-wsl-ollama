/** Ollama HTTP client. In WSL, Windows Ollama often listens on the host — try localhost then Windows host IP. */

import { readFileSync, existsSync } from "node:fs";

export function detectDefaultBase(env = process.env) {
  const fromEnv = String(env.DSH_OLLAMA_BASE || env.OLLAMA_HOST || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (existsSync("/proc/version")) {
    try {
      const v = readFileSync("/proc/version", "utf8");
      if (/microsoft|wsl/i.test(v)) {
        // WSL2 default NAT gateway = Windows host
        const resolv = readFileSync("/etc/resolv.conf", "utf8");
        const m = resolv.match(/^nameserver\s+(\S+)/m);
        if (m) return `http://${m[1]}:11434`;
      }
    } catch {
      /* fall through */
    }
  }
  return "http://127.0.0.1:11434";
}

export function createOllamaClient({
  baseUrl,
  defaultModel = "",
  timeoutMs = 120_000,
  maxPromptChars = 32_000,
  fetchImpl = fetch,
  env = process.env,
} = {}) {
  const root = String(baseUrl || detectDefaultBase(env)).replace(/\/$/, "");

  async function request(path, { method = "GET", body } = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${root}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      const text = await res.text();
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`ollama non-JSON ${res.status}: ${text.slice(0, 200)}`);
      }
      if (!res.ok) {
        throw new Error(`ollama HTTP ${res.status}: ${json?.error || text.slice(0, 200)}`);
      }
      return json;
    } finally {
      clearTimeout(t);
    }
  }

  return {
    root,
    defaultModel,
    timeoutMs,
    async status() {
      try {
        const tags = await request("/api/tags");
        const models = (tags.models || []).map((m) => m.name);
        return { ok: true, baseUrl: root, reachable: true, models, defaultModel: defaultModel || null };
      } catch (e) {
        return {
          ok: true,
          baseUrl: root,
          reachable: false,
          error: e instanceof Error ? e.message : String(e),
          models: [],
          defaultModel: defaultModel || null,
        };
      }
    },
    async list() {
      const tags = await request("/api/tags");
      return {
        ok: true,
        models: (tags.models || []).map((m) => ({
          name: m.name,
          size: m.size,
          modified_at: m.modified_at,
          digest: m.digest,
        })),
      };
    },
    async chat({ model, prompt, system, messages }) {
      const m = String(model || defaultModel || "").trim();
      if (!m) throw new Error("ollama_chat: model required (or set defaultModel / DSH_OLLAMA_MODEL)");
      let msgs = Array.isArray(messages) ? messages.map((x) => ({ role: x.role, content: String(x.content || "") })) : [];
      if (!msgs.length) {
        const p = String(prompt || "").trim();
        if (!p) throw new Error("ollama_chat: prompt or messages required");
        if (system) msgs.push({ role: "system", content: String(system) });
        msgs.push({ role: "user", content: p.slice(0, maxPromptChars) });
      }
      const json = await request("/api/chat", {
        method: "POST",
        body: { model: m, messages: msgs, stream: false },
      });
      return {
        ok: true,
        model: json.model || m,
        message: json.message?.content || "",
        done: json.done,
        total_duration: json.total_duration,
      };
    },
    async embed({ model, input }) {
      const m = String(model || defaultModel || "").trim();
      if (!m) throw new Error("ollama_embed: model required");
      const text = String(input || "").trim();
      if (!text) throw new Error("ollama_embed: input required");
      const json = await request("/api/embeddings", {
        method: "POST",
        body: { model: m, prompt: text.slice(0, maxPromptChars) },
      });
      const emb = json.embedding || json.embeddings?.[0] || [];
      return { ok: true, model: m, dims: emb.length, embedding: emb };
    },
  };
}
