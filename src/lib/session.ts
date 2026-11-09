"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";
import { announcementSchema, releaseIdSchema, senderDomainsSchema, writingInstructionsSchema } from "./contracts";
import { releaseIds, type ReleaseId } from "./releases";
import { draftAngles, draftStateSchema, type DraftAngle } from "./studio-drafts";

export type { DraftState } from "./studio-drafts";

const key = "launch-notes.v1";
const initial = "";
let fallback = initial;
const listeners = new Set<() => void>();
const workspaceSchema = z.object({
  sample: z.boolean(),
  selected: releaseIdSchema.optional(),
  imported: z.array(announcementSchema).max(3),
  drafts: z.partialRecord(releaseIdSchema, draftStateSchema),
  sampleDrafts: z.partialRecord(releaseIdSchema, draftStateSchema).default({}),
  publicDrafts: z.partialRecord(releaseIdSchema, draftStateSchema).default({}),
  writingSample: z.string().max(700),
  writingInstructions: writingInstructionsSchema.default(""),
});

export type Session = z.infer<typeof workspaceSchema>;
export type View = { page: "home" | "inbox" | "calendar" | "drafts" } | { page: "studio"; releaseId: ReleaseId; angle?: DraftAngle };

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
  if (!hash || hash === "home") return { page: "home" };
  if (hash === "calendar" || hash === "drafts") return { page: hash };
  const [page, release, angle, extra] = hash.split("/");
  const id = releaseIds.find((releaseId) => releaseId === release);
  const selected = draftAngles.find((draftAngle) => draftAngle === angle);
  return page === "studio" && id && extra === undefined && (angle === undefined || selected)
    ? { page: "studio", releaseId: id, angle: selected } : { page: "inbox" };
}
export function studioHref(id: ReleaseId, angle?: DraftAngle) {
  return `#studio/${id}${angle ? `/${angle}` : ""}`;
}
export function goTo(view: View, scroll = true) {
  window.location.hash = view.page === "studio" ? studioHref(view.releaseId, view.angle) : view.page;
  if (scroll) window.scrollTo(0, 0);
}
