import { z } from "zod";
import { boundedJson, localRoute, RequestError } from "@/lib/http.server";
import { saveLinkedIn } from "@/lib/zernio.server";

const body = z.object({
  accountId: z.string().min(1).max(150),
  content: z.string().trim().min(1).max(3000),
  requestId: z.uuid(),
}).strict();

export function POST(request: Request) {
  return localRoute(request, async () => {
    const input = body.safeParse(await boundedJson(request, 16_000));
    if (!input.success) throw new RequestError("Review the LinkedIn draft and choose an account.", 400);
    return saveLinkedIn(input.data);
  });
}
