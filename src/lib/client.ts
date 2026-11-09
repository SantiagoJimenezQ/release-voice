import { z } from "zod";

export async function request<T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
  const response = await fetch(path, body === undefined ? { cache: "no-store" } : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const parsed = z.object({ message: z.string() }).safeParse(result);
    throw new Error(parsed.success ? parsed.data.message : "This request couldn’t be completed.");
  }
  return schema.parse(result);
}
