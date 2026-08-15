import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import worker, { handleApiRequest } from "../worker/index.js";

async function withMockFetch(mock, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("falls back to index.html for an unknown app route", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          return new Response(url.pathname === "/index.html" ? "app" : "missing", {
            status: url.pathname === "/index.html" ? 200 : 404,
          });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/flow/step-two?source=share", "/index.html"]);
});

test("does not turn missing API or write requests into the app shell", async () => {
  let calls = 0;
  const env = {
    ASSETS: {
      fetch: async () => {
        calls += 1;
        return new Response("missing", { status: 404 });
      },
    },
  };

  const apiResponse = await worker.fetch(new Request("https://example.test/api/missing", { headers: { accept: "application/json" } }), env);
  assert.equal(apiResponse.status, 404);
  assert.equal(calls, 0);

  const writeResponse = await worker.fetch(new Request("https://example.test/flow", { method: "POST", headers: { accept: "text/html" } }), env);
  assert.equal(writeResponse.status, 404);
  assert.equal(calls, 1);
});

test("reports model configuration without exposing the key", async () => {
  const response = await handleApiRequest(new Request("https://example.test/api/health"), {
    DASHSCOPE_API_KEY: "server-secret",
    DASHSCOPE_MODEL: "qwen-plus",
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload, { ok: true, modelConfigured: true, provider: "aliyun-bailian", model: "qwen-plus" });
  assert.equal(JSON.stringify(payload).includes("server-secret"), false);
});

test("returns an explicit offline response when the model key is absent", async () => {
  const response = await handleApiRequest(new Request("https://example.test/api/ai/respond", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "prep", stage: 0, text: "水会向上托住物体" }),
  }), {});

  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "MODEL_NOT_CONFIGURED");
});

test("validates a real-model prep response and retries malformed JSON once", async () => {
  let calls = 0;
  await withMockFetch(async (_url, options) => {
    calls += 1;
    assert.match(options.headers.authorization, /^Bearer /);
    const content = calls === 1 ? "not-json" : JSON.stringify({ accepted: true, reply: "你讲清了向上的托力，接着用铁船举个例子吧。" });
    return new Response(JSON.stringify({ model: "qwen-plus", choices: [{ message: { content } }] }), {
      headers: { "content-type": "application/json" },
    });
  }, async () => {
    const response = await handleApiRequest(new Request("https://example.test/api/ai/respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "prep", stage: 0, text: "物体放进水里，水会向上托住它。" }),
    }), { DASHSCOPE_API_KEY: "server-secret" });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.accepted, true);
    assert.equal(payload.source, "model");
    assert.equal(calls, 2);
  });
});

test("proxies generated TTS audio without exposing its temporary URL", async () => {
  const wav = Uint8Array.from([82, 73, 70, 70, 1, 2, 3, 4]);
  await withMockFetch(async () => new Response(JSON.stringify({ output: { audio: { data: Buffer.from(wav).toString("base64") } } }), {
    headers: { "content-type": "application/json" },
  }), async () => {
    const response = await handleApiRequest(new Request("https://example.test/api/ai/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "老师，我有一个问题。" }),
    }), { DASHSCOPE_API_KEY: "server-secret" });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "audio/wav");
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), wav);
  });
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
});
