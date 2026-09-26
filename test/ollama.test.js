import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createOllamaClient, unreachableHints } from "../lib/client.js";

describe("ollama client", () => {
  it("lists via mock fetch", async () => {
    const c = createOllamaClient({
      fetchImpl: async (url) => {
        assert.match(url, /\/api\/tags$/);
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({ models: [{ name: "qwen38-27b-local" }] });
          },
        };
      },
    });
    const list = await c.list();
    assert.equal(list.models[0].name, "qwen38-27b-local");
  });

  it("chats via mock", async () => {
    const c = createOllamaClient({
      defaultModel: "m",
      fetchImpl: async (_u, opts) => {
        const body = JSON.parse(opts.body);
        assert.equal(body.model, "m");
        assert.equal(body.stream, false);
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({ model: "m", message: { content: "hi" }, done: true });
          },
        };
      },
    });
    const out = await c.chat({ prompt: "hello" });
    assert.equal(out.message, "hi");
  });

  it("status includes gateway hints when unreachable", async () => {
    const c = createOllamaClient({
      baseUrl: "http://127.0.0.1:11434",
      fetchImpl: async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    const s = await c.status();
    assert.equal(s.reachable, false);
    assert.ok(Array.isArray(s.hints));
    assert.ok(s.hints.some((h) => h.includes("10.255.255.254")));
    assert.ok(s.hints.some((h) => /localhost/i.test(h)));
  });

  it("unreachableHints mention WSL gateway", () => {
    const h = unreachableHints({ baseUrl: "http://127.0.0.1:11434" });
    assert.ok(h.some((x) => x.includes("10.255.255.254")));
  });
});
