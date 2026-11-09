import "server-only";

const loopbackHost = /^(127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/;

export class RequestError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

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

export async function boundedJson(message: Request | Response, limit: number): Promise<unknown> {
  const reader = message.body?.getReader();
  if (!reader) throw new RequestError("Missing JSON body.", 400);
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RequestError("The response or request is too large.", 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    return JSON.parse(body + decoder.decode());
  } catch (error) {
    if (error instanceof SyntaxError) throw new RequestError("Invalid JSON.", 400);
    throw error;
  } finally {
    reader.releaseLock();
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
