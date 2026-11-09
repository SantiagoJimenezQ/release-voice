"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";
import { announcementSchema, draftResponseSchema, receiptSchema, releaseIdSchema, senderDomainsSchema, writingInstructionsSchema } from "./contracts";
import { releaseIds, type ReleaseId } from "./releases";

const key = "launch-notes.v1";
const initial = "";
let fallback = initial;
const listeners = new Set<() => void>();
const draftSchema = z.object({
  generated: draftResponseSchema,
  linkedin: z.string(),
  x: z.string(),
  writingSample: z.string().optional(),
  receipt: receiptSchema.optional(),
  attempt: z.object({ requestId: z.uuid(), accountId: z.string(), content: z.string() }).optional(),
});
const workspaceSchema = z.object({
  sample: z.boolean(),
  selected: releaseIdSchema.optional(),
  imported: z.array(announcementSchema).max(3),
  drafts: z.partialRecord(releaseIdSchema, draftSchema),
  sampleDrafts: z.partialRecord(releaseIdSchema, draftSchema).default({}),
  publicDrafts: z.partialRecord(releaseIdSchema, draftSchema).default({}),
  writingSample: z.string().max(700),
  writingInstructions: writingInstructionsSchema.default(""),
});

export type DraftState = z.infer<typeof draftSchema>;
export type Session = z.infer<typeof workspaceSchema>;
export type View = { page: "inbox" | "calendar" | "drafts" } | { page: "studio"; releaseId: ReleaseId };

const empty: Session = { sample: false, imported: [], drafts: {}, sampleDrafts: {}, publicDrafts: {}, writingSample: "", writingInstructions: "" };
const serverSnapshot = () => initial;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
function snapshot() {
  try { return sessionStorage.getItem(key) ?? fallback; }
  catch { return fallback; }
}
function decode(raw: string): Session {
  if (!raw) return empty;
  try {
    const parsed = workspaceSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : empty;
  } catch { return empty; }
}
export function useSession() {
  return decode(useSyncExternalStore(subscribe, snapshot, serverSnapshot));
}
export function updateSession(update: (current: Session) => Session) {
  fallback = JSON.stringify(update(decode(snapshot())));
  try { sessionStorage.setItem(key, fallback); } catch { /* The in-memory copy still supports this tab. */ }
  for (const listener of listeners) listener();
}

const senderDomainsKey = "launch-notes.sender-domains.v1";
let senderDomainsOverride: string | undefined;

function senderDomainsSnapshot() {
  if (senderDomainsOverride !== undefined) return senderDomainsOverride;
  try { return localStorage.getItem(senderDomainsKey) ?? initial; }
  catch { return initial; }
}

function watchSenderDomains(listener: () => void) {
  const unsubscribe = subscribe(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === senderDomainsKey || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    unsubscribe();
    window.removeEventListener("storage", onStorage);
  };
}

export function useSenderDomains() {
  const raw = useSyncExternalStore(watchSenderDomains, senderDomainsSnapshot, serverSnapshot);
  if (!raw) return [];
  try { return senderDomainsSchema.safeParse(JSON.parse(raw)).data ?? []; }
  catch { return []; }
}

export function saveSenderDomains(domains: string[]) {
  const raw = JSON.stringify(domains);
  try {
    localStorage.setItem(senderDomainsKey, raw);
    senderDomainsOverride = undefined;
  } catch {
    senderDomainsOverride = raw;
  }
  for (const listener of listeners) listener();
}

const watchHash = (listener: () => void) => {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
};
export function useView(): View {
  const hash = useSyncExternalStore(watchHash, () => window.location.hash, serverSnapshot).slice(1);
  if (hash === "calendar" || hash === "drafts") return { page: hash };
  const id = releaseIds.find((releaseId) => hash === `studio/${releaseId}`);
  return id ? { page: "studio", releaseId: id } : { page: "inbox" };
}
export function goTo(view: View) {
  window.location.hash = view.page === "studio" ? `studio/${view.releaseId}` : view.page;
  window.scrollTo(0, 0);
}
