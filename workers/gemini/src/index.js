import { createRemoteJWKSet, jwtVerify } from "jose";

const firebaseKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

const allowedModels = new Set([
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
]);
const dailyUserLimit = 25;
const globalDailyLimit = 500;
const maxImageBytes = 7 * 1024 * 1024;
const maxRequestBytes = 10 * 1024 * 1024;

function json(data, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "no-store",
    },
  });
}

function failure(error, message, status, model) {
  return json({ error, message, ...(model ? { model } : {}) }, status);
}

async function requireUser(request, projectId) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error("Sign in to use hosted Gemini."), { status: 401, code: "unauthenticated" });

  try {
    const { payload } = await jwtVerify(match[1], firebaseKeys, {
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      algorithms: ["RS256"],
    });
    if (typeof payload.sub !== "string" || !payload.sub) throw new Error("Missing Firebase user ID.");
    return payload.sub;
  } catch {
    throw Object.assign(new Error("Your sign-in expired. Sign in again and retry."), { status: 401, code: "unauthenticated" });
  }
}

function validateContents(contents) {
  if (!Array.isArray(contents) || contents.length !== 1 || !Array.isArray(contents[0]?.parts)) {
    throw Object.assign(new Error("Invalid Gemini request."), { status: 400, code: "invalid-argument" });
  }

  const parts = contents[0].parts;
  if (parts.length === 0 || parts.length > 16) {
    throw Object.assign(new Error("Invalid Gemini request parts."), { status: 400, code: "invalid-argument" });
  }

  let imageCount = 0;
  for (const part of parts) {
    if (typeof part?.text === "string") {
      if (part.text.length > 60000) {
        throw Object.assign(new Error("Text input is too large."), { status: 400, code: "invalid-argument" });
      }
      continue;
    }

    const image = part?.inlineData;
    if (!image || typeof image.data !== "string" || !["image/jpeg", "image/png", "image/webp"].includes(image.mimeType)) {
      throw Object.assign(new Error("Unsupported Gemini input."), { status: 400, code: "invalid-argument" });
    }
    imageCount += 1;
    const imageBytes = Math.floor(image.data.length * 3 / 4);
    if (imageCount > 1 || imageBytes > maxImageBytes) {
      throw Object.assign(new Error("Image input is too large."), { status: 400, code: "invalid-argument" });
    }
  }
}

async function consumeQuota(db, uid) {
  const day = new Date().toISOString().slice(0, 10);
  const user = await db.prepare(`
    INSERT INTO ai_usage (scope, day, count) VALUES (?, ?, 1)
    ON CONFLICT(scope, day) DO UPDATE SET count = count + 1 WHERE count < ?
    RETURNING count
  `).bind(`user:${uid}`, day, dailyUserLimit).first();
  if (!user) {
    throw Object.assign(new Error("Your daily hosted AI limit has been reached."), { status: 429, code: "resource-exhausted" });
  }

  const global = await db.prepare(`
    INSERT INTO ai_usage (scope, day, count) VALUES ('global', ?, 1)
    ON CONFLICT(scope, day) DO UPDATE SET count = count + 1 WHERE count < ?
    RETURNING count
  `).bind(day, globalDailyLimit).first();
  if (!global) {
    throw Object.assign(new Error("Today's hosted AI capacity has been reached. Try again tomorrow."), { status: 429, code: "resource-exhausted" });
  }
}

async function callGemini(env, uid, model, contents) {
  await consumeQuota(env.AI_USAGE, uid);
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
  url.searchParams.set("key", env.GEMINI_API_KEY);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
  });

  if (response.status === 429) {
    throw Object.assign(new Error("Gemini's model quota is temporarily exhausted."), { status: 429, code: "resource-exhausted", model });
  }
  if (!response.ok) {
    console.warn("Gemini provider request failed", { status: response.status, model });
    throw Object.assign(new Error("The hosted Gemini request failed."), { status: 502, code: "unavailable" });
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || text.length > 100000) {
    throw Object.assign(new Error("Gemini returned an invalid response."), { status: 502, code: "unavailable" });
  }
  return text;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return json({}, 204);
    if (request.method !== "POST") return failure("method-not-allowed", "Use POST for this endpoint.", 405);
    if (!env.FIREBASE_PROJECT_ID || !env.GEMINI_API_KEY || !env.AI_USAGE) {
      return failure("configuration/unavailable", "The hosted AI service is not configured.", 503);
    }
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > maxRequestBytes) return failure("invalid-argument", "Request is too large.", 413);

    try {
      const uid = await requireUser(request, env.FIREBASE_PROJECT_ID);
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > maxRequestBytes) {
        return failure("invalid-argument", "Request is too large.", 413);
      }
      let data;
      try {
        data = JSON.parse(rawBody);
      } catch {
        return failure("invalid-argument", "Invalid JSON request.", 400);
      }
      const action = data?.action;
      const model = data?.model;
      if (action !== "generate" && action !== "test") {
        return failure("invalid-argument", "Unsupported hosted AI action.", 400);
      }
      if (typeof model !== "string" || !allowedModels.has(model)) {
        return failure("invalid-argument", "Unsupported Gemini model.", 400);
      }

      const contents = action === "test"
        ? [{ parts: [{ text: "Respond with the word OK." }] }]
        : data.contents;
      validateContents(contents);
      const text = await callGemini(env, uid, model, contents);
      return action === "test"
        ? json({ success: true, message: "Hosted Google Gemini connection successful." })
        : json({ text });
    } catch (error) {
      if (error.status && error.code) return failure(error.code, error.message, error.status, error.model);
      console.warn("Hosted Gemini request failed", { message: error?.message || "Unknown error" });
      return failure("unavailable", "The hosted AI service is temporarily unavailable.", 503);
    }
  },
};
