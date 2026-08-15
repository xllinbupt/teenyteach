export class AiRequestError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AiRequestError";
    this.code = code;
  }
}

async function post(path, body, timeoutMs) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new AiRequestError(payload?.error?.code || "MODEL_UNAVAILABLE", payload?.error?.message || "模型暂时没有回应。");
    }
    return response;
  } catch (error) {
    if (error?.name === "AbortError") throw new AiRequestError("MODEL_TIMEOUT", "模型想得有点久，请再试一次。");
    if (error instanceof AiRequestError) throw error;
    throw new AiRequestError("NETWORK_ERROR", "暂时连不上模型，已切换离线引导。");
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function askModel(body) {
  const response = await post("/api/ai/respond", body, 20_000);
  return response.json();
}

export async function createStudentVoice(text) {
  const response = await post("/api/ai/tts", { text }, 25_000);
  return URL.createObjectURL(await response.blob());
}
