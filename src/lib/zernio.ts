import { z } from "zod";
import { senderDomainSchema, type Connections, type Receipt } from "./contracts";
import { boundedJson, RequestError } from "./http";
import { type Announcement, matchRelease } from "./releases";

const origin = "https://zernio.com/api/v1/";
const account = z.object({
  _id: z.string().min(1),
  platform: z.string(),
  username: z.string().nullish(),
  displayName: z.string().nullish(),
  isActive: z.boolean(),
  needsReconnection: z.boolean().optional(),
});
const postEnvelope = z.object({
  post: z.object({
    _id: z.string().min(1),
    status: z.literal("draft"),
    content: z.string(),
    platforms: z.tuple([z.object({
      platform: z.literal("linkedin"),
      accountId: z.union([z.string(), z.object({ _id: z.string() })]),
    })]),
  }),
});
const mailAddress = z.object({ name: z.string().nullish(), email: z.string() }).nullish();
const mailList = z.object({ data: z.array(z.object({ id: z.string().min(1), from: mailAddress })) });
const mailDetail = z.object({ data: z.object({
  subject: z.string(),
  from: mailAddress,
  text: z.string().nullish(),
  html: z.string().nullish(),
  snippet: z.string().nullish(),
}) });

type ZernioRequest = (path: string, options?: RequestInit) => Promise<unknown>;

export class UnconfirmedZernioSave extends Error {
  constructor() {
    super("Zernio did not confirm this save. Check your drafts in Zernio before trying again.");
  }
}

class RejectedZernioRequest extends RequestError {}

async function listConnections(zernio: ZernioRequest, { linkedInId, mailId }: {
  linkedInId?: string;
  mailId?: string;
}): Promise<Connections> {
  const response = z.object({ accounts: z.array(account) }).parse(await zernio(
    "accounts?platforms=linkedin,google,microsoft&status=connected&excludeHidden=true",
  ));
  const active = response.accounts.filter((item) => item.isActive && !item.needsReconnection);
  const identify = (item: z.infer<typeof account>) => ({
    id: item._id,
    label: item.displayName || item.username || item.platform,
  });
  return {
    configured: true,
    linkedin: active.filter((item) => item.platform === "linkedin" && (!linkedInId || item._id === linkedInId)).map(identify),
    mail: active.filter((item) => ["google", "microsoft"].includes(item.platform) && (!mailId || item._id === mailId)).map((item) => ({
      ...identify(item),
      provider: item.platform === "google" ? "Gmail" : "Outlook",
    })),
  };
}

export type LinkedInSave = { accountId: string; content: string; requestId: string };

async function saveDraft(zernio: ZernioRequest, connections: () => Promise<Connections>, input: LinkedInSave, browser: boolean): Promise<Receipt> {
  const target = (await connections()).linkedin.find((item) => item.id === input.accountId);
  if (!target) throw new RequestError("Select a connected LinkedIn account in Zernio first.", 409);
  const payload = {
    content: input.content,
    platforms: [{ platform: "linkedin", accountId: target.id }],
    isDraft: true,
    publishNow: false,
  };
  try {
    const { post } = postEnvelope.parse(await zernio("posts", {
      method: "POST",
      // Zernio's CORS policy does not allow this header in the browser.
      headers: browser ? undefined : { "Idempotency-Key": input.requestId },
      body: JSON.stringify(payload),
    }));
    const returnedTarget = post.platforms[0].accountId;
    const returnedId = typeof returnedTarget === "string" ? returnedTarget : returnedTarget._id;
    if (returnedId !== target.id || post.content !== input.content) {
      throw new RequestError("Zernio’s receipt didn’t match this draft.");
    }
    return { postId: post._id, account: target.label, status: "draft", mode: "zernio", content: post.content };
  } catch (error) {
    if (browser && !(error instanceof RejectedZernioRequest)) throw new UnconfirmedZernioSave();
    throw error;
  }
}

function getSenderDomain(email: string | undefined) {
  if (!email) return undefined;
  const address = email.trim();
  if (!z.regexes.html5Email.test(address)) return undefined;
  const domain = senderDomainSchema.safeParse(address.slice(address.lastIndexOf("@") + 1));
  return domain.success ? domain.data : undefined;
}

async function readMail(zernio: ZernioRequest, connections: () => Promise<Connections>, accountId: string, allowedDomains: readonly string[]): Promise<Announcement[]> {
  const mailbox = (await connections()).mail.find((item) => item.id === accountId);
  if (!mailbox) throw new RequestError("Connect Gmail or Outlook in Zernio first.", 409);
  const allows = (domain?: string) => !allowedDomains.length || (domain !== undefined && allowedDomains.includes(domain));
  const subjects = ["Post approvals", "Google and Microsoft", "product updates"];
  const pages = await Promise.all(subjects.map(async (subject) => {
    // Scan more headers with a filter so unrelated senders don't fill the three detail slots.
    const query = new URLSearchParams({ accountId, subject, limit: allowedDomains.length ? "30" : "3", folder: "inbox" });
    const { data } = mailList.parse(await zernio(`email/messages?${query}`));
    return data.filter((item) => !item.from?.email || allows(getSenderDomain(item.from.email))).slice(0, 3);
  }));
  const ids = [...new Set(pages.flat().map((item) => item.id))];
  const query = new URLSearchParams({ accountId });
  const messages = await Promise.all(ids.map(async (id) => (
    mailDetail.parse(await zernio(`email/messages/${encodeURIComponent(id)}?${query}`)).data
  )));
  const matches = new Map<string, Announcement>();
  for (const message of messages) {
    const senderDomain = getSenderDomain(message.from?.email);
    if (!allows(senderDomain)) continue;
    const text = message.text || message.snippet || "";
    const urls = `${text}\n${message.html ?? ""}`.match(/https:\/\/zernio\.com\/blog\/[a-z0-9-]+/gi) ?? [];
    for (const url of urls) {
      const releaseId = matchRelease(url);
      if (!releaseId || matches.has(releaseId)) continue;
      matches.set(releaseId, {
        releaseId,
        source: "email",
        subject: message.subject.slice(0, 180),
        sender: (message.from?.name || message.from?.email || "Marketing").slice(0, 120),
        senderDomain,
        provider: mailbox.provider,
        message: text.trim().slice(0, 1000),
      });
    }
  }
  return [...matches.values()];
}

export function createZernioClient(apiKey: string, options: { browser?: boolean; linkedInId?: string; mailId?: string } = {}) {
  async function zernio(path: string, init: RequestInit = {}): Promise<unknown> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${apiKey}`);
    if (init.body) headers.set("Content-Type", "application/json");
    const response = await fetch(origin + path, {
      ...init,
      headers,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    }).catch(() => { throw new RequestError("Couldn’t reach Zernio. Check your connection and try again."); });
    if (!response.ok) {
      await response.body?.cancel();
      const message = response.status === 401 ? "Zernio didn’t accept this API key." : `Zernio couldn’t complete the request (HTTP ${response.status}).`;
      if (response.status >= 400 && response.status < 500 && ![408, 409].includes(response.status)) {
        throw new RejectedZernioRequest(message);
      }
      throw new RequestError(message);
    }
    return boundedJson(response, 512_000);
  }

  const connections = () => listConnections(zernio, options);
  return {
    connections,
    readLaunchEmails: (accountId: string, allowedDomains: readonly string[]) => readMail(zernio, connections, accountId, allowedDomains),
    saveLinkedIn: (input: LinkedInSave) => saveDraft(zernio, connections, input, options.browser === true),
  };
}
