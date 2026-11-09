import { z } from "zod";
import { senderDomainsSchema } from "@/lib/contracts";
import { localRoute, RequestError } from "@/lib/http.server";
import { readLaunchEmails } from "@/lib/zernio.server";

export function GET(request: Request) {
  return localRoute(request, async () => {
    const params = new URL(request.url).searchParams;
    const account = z.string().min(1).max(150).safeParse(params.get("accountId"));
    if (!account.success) throw new RequestError("Choose an email account.", 400);
    const domains = senderDomainsSchema.safeParse(params.getAll("senderDomain"));
    if (!domains.success) throw new RequestError("Enter up to 10 sender domains, such as zernio.com.", 400);
    return readLaunchEmails(account.data, domains.data);
  });
}
