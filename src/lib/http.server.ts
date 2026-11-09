import "server-only";

import { RequestError } from "./http";

export { boundedJson, RequestError } from "./http";

const loopbackHost = /^(127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/;

export function isPublicDemo() {
  return process.env.VERCEL === "1" || process.env.RELEASE_VOICE_MODE === "public";
}

function isSameSite(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  return site === null || site === "same-origin" || site === "none";
}

export function requireLocal(request: Request) {
  const host = request.headers.get("host") ?? "";
  const origin = request.headers.get("origin");
  const sameOrigin = origin === `http://${host}`;
  if (!loopbackHost.test(host) || (origin !== null && !sameOrigin)
    || !isSameSite(request)
    || (request.method !== "GET" && !sameOrigin)) {
    throw new RequestError("Use Release Voice from its local browser tab.", 403);
  }
}

export function requireGenerationOrigin(request: Request) {
  const host = request.headers.get("host") ?? "";
  if (!isPublicDemo() || loopbackHost.test(host)) return requireLocal(request);
  if (!host || request.headers.get("origin") !== `https://${host}` || !isSameSite(request)) {
    throw new RequestError("Open Release Voice directly to generate drafts.", 403);
  }
}

export async function jsonRoute(action: () => Promise<unknown>) {
  try {
    return Response.json(await action(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 502;
    const message = error instanceof RequestError ? error.message : "This request couldn’t be completed.";
    return Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}

export function localRoute(request: Request, action: () => Promise<unknown>) {
  return jsonRoute(async () => {
    if (isPublicDemo()) throw new RequestError("Connected accounts are available in local mode.", 403);
    requireLocal(request);
    return action();
  });
}
