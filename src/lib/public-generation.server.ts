import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { boundedJson, RequestError } from "./http.server";

const visitorWindow = 600;
const dailyWindow = 86_400;
const visitorLimit = 6;
const dailyLimit = 120;

// Check and reserve both counters atomically across function instances.
const reserve = `
  local visitor = tonumber(redis.call('GET', KEYS[1]) or '0')
  local daily = tonumber(redis.call('GET', KEYS[2]) or '0')
  if visitor >= tonumber(ARGV[1]) or daily >= tonumber(ARGV[2]) then return 0 end
  if redis.call('INCR', KEYS[1]) == 1 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end
  if redis.call('INCR', KEYS[2]) == 1 then redis.call('EXPIRE', KEYS[2], ARGV[4]) end
  return 1
`;

function rateLimitConfig() {
  const endpoint = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!endpoint || !token) return;
  const url = URL.parse(endpoint);
  if (!url || url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") return;
  return { url, token };
}

export function publicGenerationConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim() && process.env.OPENROUTER_MODEL?.trim() && rateLimitConfig());
}

export async function reservePublicGeneration(request: Request) {
  const config = rateLimitConfig();
  const unavailable = new RequestError("Live drafting is temporarily unavailable. Try again shortly.", 503);
  if (!config) throw unavailable;

  // Vercel supplies this header. A missing or malformed IP uses a shared bucket.
  const ip = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.trim() : undefined;
  const visitor = createHmac("sha256", config.token).update(ip && isIP(ip) ? ip : "unknown").digest("hex");
  const now = Math.floor(Date.now() / 1000);
  const visitorKey = `{release-voice}:visitor:${visitor}:${Math.floor(now / visitorWindow)}`;
  const dailyKey = `{release-voice}:day:${Math.floor(now / dailyWindow)}`;

  const response = await fetch(config.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["EVAL", reserve, 2, visitorKey, dailyKey, visitorLimit, dailyLimit, visitorWindow, dailyWindow]),
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(4_000),
  }).catch(() => { throw unavailable; });
  if (!response.ok) {
    await response.body?.cancel();
    throw unavailable;
  }
  const result = z.object({ result: z.union([z.literal(0), z.literal(1)]) }).safeParse(
    await boundedJson(response, 4096).catch(() => null),
  );
  if (!result.success) throw unavailable;
  if (result.data.result === 0) throw new RequestError("This demo has reached a drafting limit. Try again later.", 429);
}
