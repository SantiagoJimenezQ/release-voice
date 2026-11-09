import "server-only";

import { z } from "zod";
import { senderDomainSchema, type Connections, type Receipt } from "./contracts";
import { boundedJson, RequestError } from "./http.server";
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

async function zernio(path: string, options: RequestInit = {}): Promise<unknown> {
  const key = process.env.ZERNIO_API_KEY;
  if (!key) throw new RequestError("Add a Zernio API key to use a connected account.", 503);
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${key}`);
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await fetch(origin + path, {
    ...options,
    headers,
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  }).catch(() => { throw new RequestError("Zernio did not return a confirmation. You can retry."); });
  if (!response.ok) {
    await response.body?.cancel();
    throw new RequestError(`Zernio couldn’t complete the request (HTTP ${response.status}).`);
  }
  return boundedJson(response, 512_000);
}

export async function connections(): Promise<Connections> {
  if (!process.env.ZERNIO_API_KEY) return { configured: false, linkedin: [], mail: [] };
  const response = z.object({ accounts: z.array(account) }).parse(await zernio(
    "accounts?platforms=linkedin,google,microsoft&status=connected&excludeHidden=true",
  ));
  const active = response.accounts.filter((item) => item.isActive && !item.needsReconnection);
  const linkedInId = process.env.LAUNCH_NOTES_LINKEDIN_ACCOUNT_ID;
  const mailId = process.env.LAUNCH_NOTES_MAIL_ACCOUNT_ID;
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

export async function saveLinkedIn(input: { accountId: string; content: string; requestId: string }): Promise<Receipt> {
  const target = (await connections()).linkedin.find((item) => item.id === input.accountId);
  if (!target) throw new RequestError("Select a connected LinkedIn account in Zernio first.", 409);
  const payload = {
    content: input.content,
    platforms: [{ platform: "linkedin", accountId: target.id }],
    isDraft: true,
    publishNow: false,
  };
  const { post } = postEnvelope.parse(await zernio("posts", {
    method: "POST",
    headers: { "Idempotency-Key": input.requestId },
    body: JSON.stringify(payload),
  }));
  const returnedTarget = post.platforms[0].accountId;
  const returnedId = typeof returnedTarget === "string" ? returnedTarget : returnedTarget._id;
  if (returnedId !== target.id || post.content !== input.content) {
    throw new RequestError("Zernio’s receipt didn’t match this draft.");
  }
  return { postId: post._id, account: target.label, status: "draft", mode: "zernio", content: post.content };
}

function getSenderDomain(email: string | undefined) {
  if (!email) return undefined;
  const address = email.trim();
  if (!z.regexes.html5Email.test(address)) return undefined;
  const domain = senderDomainSchema.safeParse(address.slice(address.lastIndexOf("@") + 1));
  return domain.success ? domain.data : undefined;
}

export async function readLaunchEmails(accountId: string, allowedDomains: readonly string[]): Promise<Announcement[]> {
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
