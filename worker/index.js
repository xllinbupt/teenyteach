const DEFAULT_CHAT_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const DEFAULT_TTS_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
const STUDENT_IDS = ["rabbit", "panda", "kitten", "fox", "bear", "hamster"];

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function apiError(code, message, status = 500) {
  return json({ error: { code, message } }, status);
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function readJson(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 32_000) throw new Error("REQUEST_TOO_LARGE");
  return request.json();
}

function parseModelJson(content) {
  if (typeof content !== "string") throw new Error("MODEL_INVALID_JSON");
  return JSON.parse(content.replace(/^```json\s*|\s*```$/g, ""));
}

async function callQwen(env, systemPrompt, userPayload, validate) {
  const apiKey = env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("MODEL_NOT_CONFIGURED");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);
  let repair = "";

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(env.DASHSCOPE_CHAT_URL || DEFAULT_CHAT_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: env.DASHSCOPE_MODEL || "qwen-plus",
          messages: [
            { role: "system", content: `${systemPrompt}\n必须只输出一个合法 JSON 对象，不要 Markdown。${repair}` },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
          response_format: { type: "json_object" },
          enable_thinking: false,
          temperature: 0.35,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const upstream = await response.json().catch(() => ({}));
        const error = new Error("MODEL_UPSTREAM_ERROR");
        error.status = response.status;
        error.detail = cleanText(upstream?.error?.message || upstream?.message, 160);
        throw error;
      }

      const payload = await response.json();
      try {
        const result = parseModelJson(payload?.choices?.[0]?.message?.content);
        if (!validate(result)) throw new Error("MODEL_SCHEMA_MISMATCH");
        return { ...result, source: "model", model: payload.model || env.DASHSCOPE_MODEL || "qwen-plus" };
      } catch {
        repair = "上一次输出不符合字段约束，请重新检查字段、类型和字数。";
      }
    }
    throw new Error("MODEL_INVALID_RESPONSE");
  } finally {
    clearTimeout(timeout);
  }
}

function prepPrompt(stage) {
  const goals = [
    "判断孩子是否说明水或液体给物体向上的托力。",
    "判断孩子是否用铁块和铁船说明形状、中空结构或排开更多水如何影响浮沉。",
    "判断孩子是否直接回应空气减少后的浮沉变化，并提到形状、排水量、浮力或下沉。",
  ];
  return `你是面向小学三至六年级的 AI 备课搭子“小墨”，主题仅限科学课“浮力”。${goals[stage]}先认真回应孩子已经说对的部分；信息不足时一次只追问一个具体缺口，不直接给完整答案；信息足够时自然引向下一步。不得索要身份、学校或联系方式，不评价智力和人格。输出 JSON：{"accepted":boolean,"reply":"不超过100字的中文回复"}。`;
}

function teachPrompt(action) {
  if (action === "feedback") {
    return "你是小学科学课里的动物学生。依据老师刚才对问题的回答，用一两句儿童口吻说明自己听懂了什么；如果仍有明显误解，温和指出还没听明白的唯一一点。不得引入超出浮力主题的新知识。输出 JSON：{\"feedback\":\"不超过80字\",\"understood\":boolean}。";
  }
  return "你是小学科学课堂编排器。根据老师刚才关于浮力的讲解和已有对话，从允许的动物学生中选择一位，提出一个最能推动老师继续解释的短问题。问题必须像小学生会问的话，只问一件事，不重复已有问题，不索要个人信息。输出 JSON：{\"studentId\":\"允许名单中的ID\",\"question\":\"不超过50字\",\"questionType\":\"clarify|example|transfer\"}。";
}

function validPrep(result) {
  return typeof result?.accepted === "boolean" && cleanText(result?.reply, 101).length > 0 && result.reply.length <= 100;
}

function validQuestion(result) {
  return STUDENT_IDS.includes(result?.studentId) && cleanText(result?.question, 51).length > 0 && result.question.length <= 50 && ["clarify", "example", "transfer"].includes(result?.questionType);
}

function validFeedback(result) {
  return typeof result?.understood === "boolean" && cleanText(result?.feedback, 81).length > 0 && result.feedback.length <= 80;
}

async function handleModelRequest(request, env) {
  const body = await readJson(request);
  const kind = body?.kind;
  const text = cleanText(body?.text, 500);
  if (!text) return apiError("INVALID_INPUT", "请先说出自己的想法。", 400);

  if (kind === "prep") {
    const stage = Number(body.stage);
    if (![0, 1, 2].includes(stage)) return apiError("INVALID_INPUT", "备课轮次无效。", 400);
    return json(await callQwen(env, prepPrompt(stage), {
      stage,
      childAnswer: text,
      acceptedAnswers: Array.isArray(body.previousAnswers) ? body.previousAnswers.map((item) => cleanText(item, 180)).slice(0, 3) : [],
    }, validPrep));
  }

  if (kind === "teach") {
    const action = body.action;
    const history = Array.isArray(body.history) ? body.history.map((entry) => ({
      role: entry?.role === "teacher" ? "teacher" : "student",
      text: cleanText(entry?.text, 180),
    })).filter((entry) => entry.text).slice(-10) : [];
    if (action === "question") {
      const excluded = Array.isArray(body.excludedStudentIds) ? body.excludedStudentIds.filter((id) => STUDENT_IDS.includes(id)) : [];
      const allowedStudentIds = STUDENT_IDS.filter((id) => !excluded.includes(id));
      return json(await callQwen(env, teachPrompt(action), { teacherExplanation: text, history, allowedStudentIds }, (result) => validQuestion(result) && allowedStudentIds.includes(result.studentId)));
    }
    if (action === "feedback") {
      const studentId = STUDENT_IDS.includes(body.studentId) ? body.studentId : "rabbit";
      return json(await callQwen(env, teachPrompt(action), { studentId, question: cleanText(body.question, 100), teacherAnswer: text, history }, validFeedback));
    }
  }

  return apiError("INVALID_INPUT", "模型任务类型无效。", 400);
}

async function handleTtsRequest(request, env) {
  if (!env.DASHSCOPE_API_KEY) return apiError("MODEL_NOT_CONFIGURED", "尚未配置百炼 API Key。", 503);
  const body = await readJson(request);
  const text = cleanText(body?.text, 120);
  if (!text) return apiError("INVALID_INPUT", "没有可朗读的学生发言。", 400);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(env.DASHSCOPE_TTS_URL || DEFAULT_TTS_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${env.DASHSCOPE_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: env.DASHSCOPE_TTS_MODEL || "qwen3-tts-flash",
        input: { text, voice: env.DASHSCOPE_TTS_VOICE || "Cherry", language_type: "Chinese" },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("TTS_UPSTREAM_ERROR");
    const payload = await response.json();
    const audio = payload?.output?.audio;
    if (audio?.data) {
      const binary = atob(audio.data);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return new Response(bytes, { headers: { "content-type": "audio/wav", "cache-control": "private, max-age=3600" } });
    }
    if (audio?.url) {
      const audioUrl = new URL(audio.url);
      if (audioUrl.protocol !== "https:") throw new Error("TTS_INVALID_URL");
      const audioResponse = await fetch(audioUrl, { signal: controller.signal });
      if (!audioResponse.ok) throw new Error("TTS_DOWNLOAD_ERROR");
      return new Response(audioResponse.body, { headers: { "content-type": audioResponse.headers.get("content-type") || "audio/wav", "cache-control": "private, max-age=3600" } });
    }
    throw new Error("TTS_INVALID_RESPONSE");
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleApiRequest(request, env = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({ ok: true, modelConfigured: Boolean(env.DASHSCOPE_API_KEY), provider: "aliyun-bailian", model: env.DASHSCOPE_MODEL || "qwen-plus" });
  }
  if (!["/api/ai/respond", "/api/ai/tts"].includes(url.pathname)) return apiError("NOT_FOUND", "接口不存在。", 404);
  if (request.method !== "POST") return apiError("METHOD_NOT_ALLOWED", "请求方式不支持。", 405);

  try {
    if (url.pathname === "/api/ai/respond") return await handleModelRequest(request, env);
    if (url.pathname === "/api/ai/tts") return await handleTtsRequest(request, env);
  } catch (error) {
    if (error?.message !== "MODEL_NOT_CONFIGURED") {
      console.error("[teenyteach-ai]", { code: error?.message, status: error?.status, detail: error?.detail, cause: error?.cause?.code });
    }
    if (error?.name === "AbortError") return apiError("MODEL_TIMEOUT", "模型想得有点久，请再试一次。", 504);
    if (error?.message === "MODEL_NOT_CONFIGURED") return apiError("MODEL_NOT_CONFIGURED", "尚未配置百炼 API Key，已切换离线引导。", 503);
    if (error?.message === "REQUEST_TOO_LARGE" || error instanceof SyntaxError) return apiError("INVALID_INPUT", "提交内容格式不正确。", 400);
    return apiError("MODEL_UNAVAILABLE", "模型暂时没有回应，已切换离线引导。", error?.status === 429 ? 429 : 502);
  }
}

export default {
  async fetch(request, env) {
    const apiResponse = await handleApiRequest(request, env);
    if (apiResponse) return apiResponse;

    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) return response;

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
