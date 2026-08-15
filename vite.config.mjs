import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { handleApiRequest } from "./worker/index.js";

function localApiPlugin(env) {
  return {
    name: "teenyteach-local-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith("/api/")) return next();
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const body = chunks.length ? Buffer.concat(chunks) : undefined;
        const webRequest = new Request(new URL(request.url, `http://${request.headers.host || "localhost"}`), {
          method: request.method,
          headers: request.headers,
          body: ["GET", "HEAD"].includes(request.method) ? undefined : body,
        });
        const apiResponse = await handleApiRequest(webRequest, env);
        response.statusCode = apiResponse.status;
        apiResponse.headers.forEach((value, key) => response.setHeader(key, value));
        response.end(Buffer.from(await apiResponse.arrayBuffer()));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, process.cwd(), "DASHSCOPE_");
  return {
    build: {
      outDir: "dist/client",
    },
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      warmup: {
        clientFiles: ["./src/main.jsx"],
      },
    },
    plugins: [react(), localApiPlugin(loaded)],
  };
});
