export class RequestError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
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
