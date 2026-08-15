import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import app from "../worker/index.js";

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const staticRoot = resolve(process.env.STATIC_ROOT || "dist/client");
const maxBodyBytes = 64 * 1024;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webp": "image/webp",
};

function jsonError(response, status, code, message) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify({ error: { code, message } }));
}

async function readRequestBody(request, response) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      jsonError(response, 413, "REQUEST_TOO_LARGE", "提交内容过长，请精简后再试。" );
      return null;
    }
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function assetResponse(request) {
  if (!["GET", "HEAD"].includes(request.method)) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = resolve(staticRoot, relativePath);
  if (filePath !== staticRoot && !filePath.startsWith(`${staticRoot}${sep}`)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const metadata = await stat(filePath);
    if (!metadata.isFile()) return new Response("Not found", { status: 404 });
    const headers = new Headers({
      "content-type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
      "content-length": String(metadata.size),
      "cache-control": relativePath.startsWith("assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    });
    return new Response(request.method === "HEAD" ? null : await readFile(filePath), { headers });
  } catch (error) {
    if (error?.code === "ENOENT") return new Response("Not found", { status: 404 });
    throw error;
  }
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const method = incoming.method || "GET";
    const body = ["GET", "HEAD"].includes(method) ? undefined : await readRequestBody(incoming, outgoing);
    if (body === null) return;

    const request = new Request(new URL(incoming.url || "/", `http://${incoming.headers.host || "localhost"}`), {
      method,
      headers: incoming.headers,
      body,
    });
    const response = await app.fetch(request, { ...process.env, ASSETS: { fetch: assetResponse } });
    const headers = Object.fromEntries(response.headers.entries());
    headers["x-content-type-options"] = "nosniff";
    headers["referrer-policy"] = "same-origin";
    outgoing.writeHead(response.status, headers);
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("[teenyteach-server]", error);
    if (!outgoing.headersSent) jsonError(outgoing, 500, "INTERNAL_ERROR", "服务暂时不可用，请稍后再试。" );
    else outgoing.end();
  }
});

server.listen(port, host, () => {
  console.log(`[teenyteach-server] listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
