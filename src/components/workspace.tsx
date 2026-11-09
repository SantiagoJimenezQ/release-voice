"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Link2, LoaderCircle, Mail, Pencil, Settings2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { request } from "@/lib/client";
import { announcementSchema, connectionsSchema, draftResponseSchema, receiptSchema, senderDomainsSchema, writingInstructionsLimit, type Connections, type Receipt } from "@/lib/contracts";
import { matchRelease, releases, sampleAnnouncements, type Announcement, type ReleaseId } from "@/lib/releases";
import { goTo, saveSenderDomains, updateSession, useSenderDomains, useSession, useView } from "@/lib/session";
import { angleDraft, recommendedAngles, rehearsalFieldsSchema, updateAngleDraft, type Channel, type DraftAngle, type DraftVariant, type RehearsalFields } from "@/lib/studio-drafts";
import { LandingHeader, Topbar } from "./chrome";
import { AnnouncementBody, Inbox } from "./inbox";
import { Welcome } from "./welcome";
import { Calendar } from "./plan";
import { SavedDrafts } from "./saved-drafts";
import { Studio } from "./studio";

type Overlay = "workspace" | "email" | "source" | "paste" | "connect" | "inbox-settings" | "writing-settings" | null;
type Action = "generate" | "save" | "mail" | null;
const emptyConnections: Connections = { configured: false, linkedin: [], mail: [] };

function linkAnnouncement(releaseId: ReleaseId): Announcement {
  return { releaseId, source: "link", subject: releases[releaseId].subject };
}

export function Workspace({ publicDemo, publicLiveDrafting }: { publicDemo: boolean; publicLiveDrafting: boolean }) {
  const session = useSession();
  const allowedDomains = useSenderDomains();
  const view = useView();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [action, setAction] = useState<Action>(null);
  const [notice, setNotice] = useState("");
  const [connections, setConnections] = useState(emptyConnections);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [mail, setMail] = useState<Announcement[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [writingInput, setWritingInput] = useState({ writingInstructions: "", writingSample: "" });
  const [paste, setPaste] = useState("");
  const [connectFor, setConnectFor] = useState<"email" | "linkedin">("email");
  const [dialogNotice, setDialogNotice] = useState("");
  const busy = useRef(false);
  const sample = publicDemo || session.sample;
  const draftKey = publicDemo ? "publicDrafts" : sample ? "sampleDrafts" : "drafts";
  const drafts = session[draftKey];
  const visibleMail = allowedDomains.length ? mail.filter((item) => item.senderDomain && allowedDomains.includes(item.senderDomain)) : mail;
  const items = sample ? sampleAnnouncements : [...new Map(
    [...session.imported, ...visibleMail].map((item) => [item.releaseId, item]),
  ).values()];
  const selected = items.find((item) => item.releaseId === (session.selected ?? (publicDemo ? "approvals" : undefined))) ?? items[0];
  const studioId = view.page === "studio" ? view.releaseId : undefined;
  const studioAngle = view.page === "studio" ? view.angle ?? recommendedAngles[view.releaseId].angle : "original";
  const draft = studioId ? drafts[studioId] : undefined;
  const variant = studioId && draft ? angleDraft(studioId, studioAngle, draft) : undefined;
  const studioItem = studioId ? items.find((item) => item.releaseId === studioId) ?? linkAnnouncement(studioId) : undefined;
  const target = connections.linkedin.find((item) => item.id === targetId) ?? (
    connections.linkedin.length === 1 ? connections.linkedin[0] : undefined
  );

  useEffect(() => {
    if (publicDemo) return;
    let cancelled = false;
    void request("/api/connections", connectionsSchema).then((data) => {
      if (!cancelled) setConnections(data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [publicDemo]);

  function show(kind: Overlay) {
    setDialogNotice("");
    setOverlay(kind);
  }

  async function refreshConnections() {
    setLoadingConnections(true);
    setDialogNotice("");
    try {
      setConnections(await request("/api/connections", connectionsSchema));
    } catch (error) {
      setDialogNotice(message(error));
    } finally {
      setLoadingConnections(false);
    }
  }

  function openConnections(forKind: "email" | "linkedin") {
    setConnectFor(forKind);
    show("connect");
    void refreshConnections();
  }

  function openInboxSettings() {
    setDomainInput(allowedDomains.join("\n"));
    show("inbox-settings");
  }

  function saveInboxSettings() {
    const domains = senderDomainsSchema.safeParse(domainInput.split(/[\s,]+/).filter(Boolean));
    if (!domains.success) {
      setDialogNotice("Enter up to 10 sender domains, such as zernio.com.");
      return;
    }
    saveSenderDomains([...new Set(domains.data)]);
    show(null);
  }

  function openWritingSettings() {
    setWritingInput({ writingInstructions: session.writingInstructions, writingSample: session.writingSample });
    show("writing-settings");
  }

  function switchWorkspace(sample: boolean) {
    updateSession((current) => ({ ...current, sample, selected: sample ? "approvals" : undefined }));
    setNotice("");
    show(null);
    goTo({ page: "inbox" });
  }

  function importLink() {
    const id = matchRelease(paste);
    if (!id) {
      setDialogNotice("Paste one of the three Zernio release links for this demo.");
      return;
    }
    updateSession((current) => ({
      ...current,
      sample: false,
      selected: id,
      imported: [...current.imported.filter((item) => item.releaseId !== id), linkAnnouncement(id)],
    }));
    setPaste("");
    show(null);
    goTo({ page: "inbox" });
  }

  async function importMail(accountId: string) {
    if (busy.current) return;
    busy.current = true;
    setAction("mail");
    setDialogNotice("");
    try {
      const query = new URLSearchParams({ accountId });
      for (const domain of allowedDomains) query.append("senderDomain", domain);
      const items = await request(`/api/mail?${query}`, z.array(announcementSchema));
      setMail(items);
      if (!items.length) {
        setDialogNotice(allowedDomains.length ? "No launch emails matched your allowed sender domains." : "No matching launch emails yet. You can paste a release link from the inbox.");
        return;
      }
      updateSession((current) => ({ ...current, sample: false, selected: items[0].releaseId }));
      show(null);
      goTo({ page: "inbox" });
    } catch (error) {
      setDialogNotice(message(error));
    } finally {
      busy.current = false;
      setAction(null);
    }
  }

  async function openStudio(id: ReleaseId, angle?: DraftAngle) {
    if (busy.current) return;
    setNotice("");
    if (drafts[id]) {
      goTo({ page: "studio", releaseId: id, angle });
      return;
    }
    busy.current = true;
    setAction("generate");
    try {
      const sampleMode = publicDemo ? !publicLiveDrafting : session.sample;
      const writingSample = sampleMode ? "" : session.writingSample.trim();
      const generated = await request("/api/generate", draftResponseSchema, {
        releaseId: id,
        sampleMode,
        writingSample,
        writingInstructions: sampleMode ? undefined : session.writingInstructions.trim(),
      });
      updateSession((current) => ({
        ...current,
        [draftKey]: { ...current[draftKey], [id]: {
          generated,
          linkedin: `${generated.opening}\n${generated.linkedinBody}`,
          x: generated.x,
          writingSample: generated.source === "model" && writingSample ? writingSample : undefined,
        } },
      }));
      goTo({ page: "studio", releaseId: id, angle });
    } catch (error) {
      setNotice(message(error));
    } finally {
      busy.current = false;
      setAction(null);
    }
  }

  function changeDraft(id: ReleaseId, angle: DraftAngle, update: (current: DraftVariant) => DraftVariant) {
    updateSession((current) => {
      const old = current[draftKey][id];
      return old ? { ...current, [draftKey]: { ...current[draftKey], [id]: updateAngleDraft(id, angle, old, update) } } : current;
    });
  }

  function scheduleDraft(id: ReleaseId, angle: DraftAngle, channel: Channel, fields: RehearsalFields) {
    const parsed = rehearsalFieldsSchema.safeParse(fields);
    if (!parsed.success) return;
    changeDraft(id, angle, (current) => {
      const content = current[channel].trim();
      if (!content || content.length > (channel === "x" ? 280 : 3000)) return current;
      return { ...current, schedules: { ...current.schedules, [channel]: { ...parsed.data, content } } };
    });
  }

  async function saveDraft(id: ReleaseId, angle: DraftAngle, draft: DraftVariant) {
    const content = draft.linkedin.trim();
    if (busy.current || draft.receipt || !content) return;
    setNotice("");
    if (sample) {
      const receipt: Receipt = { mode: "sample", status: "draft", content, account: "Alex Rivera", postId: crypto.randomUUID() };
      changeDraft(id, angle, (current) => ({ ...current, receipt }));
      return;
    }
    if (!target) {
      openConnections("linkedin");
      return;
    }
    busy.current = true;
    setAction("save");
    const previous = draft.attempt;
    const attempt = previous?.accountId === target.id && previous.content === content
      ? previous : { requestId: crypto.randomUUID(), accountId: target.id, content };
    changeDraft(id, angle, (current) => ({ ...current, attempt }));
    try {
      const receipt = await request("/api/linkedin-draft", receiptSchema, attempt);
      if (receipt.mode !== "zernio") throw new Error("A live Zernio receipt is required.");
      changeDraft(id, angle, (current) => ({ ...current, receipt }));
    } catch (error) {
      setNotice(message(error));
    } finally {
      busy.current = false;
      setAction(null);
    }
  }

  const source = studioId ? releases[studioId].sample : undefined;
  const displayed = view.page === "home" || (view.page === "studio" && !draft) ? { page: "inbox" as const } : view;
  const showWelcome = view.page === "home";

  function startSample() {
    if (publicDemo) {
      updateSession((current) => ({ ...current, selected: "approvals" }));
      goTo({ page: "inbox" });
    } else {
      switchWorkspace(true);
    }
  }

  return (
    <>
      {showWelcome ? <LandingHeader /> : (
        <Topbar view={displayed} sample={sample} publicDemo={publicDemo} openWorkspace={() => show("workspace")} />
      )}
      {notice ? <p className="notice" role="status">{notice}</p> : null}
      {studioId && draft && variant ? (
        <Studio key={`${draftKey}/${studioId}`} id={studioId} angle={studioAngle} draft={draft}
          focusChannel={view.page === "studio" ? view.channel : undefined}
          author={sample ? "Alex Rivera" : (variant.receipt?.account || target?.label || "Your workspace")}
          account={sample ? undefined : variant.receipt?.account ?? target?.label} sample={sample} saving={action === "save"}
          onAngleChange={(angle) => goTo({ page: "studio", releaseId: studioId, angle }, false)}
          onEdit={(channel, value) => changeDraft(studioId, studioAngle, (current) => busy.current ? current : ({ ...current, [channel]: value }))}
          onSource={() => show("source")} onEmail={() => show("email")} onSave={() => void saveDraft(studioId, studioAngle, variant)}
          onSchedule={(channel, fields) => scheduleDraft(studioId, studioAngle, channel, fields)} />
      ) : displayed.page === "calendar" ? <Calendar items={items} drafts={drafts} date={displayed.date} busy={action === "generate"} onDraft={(id, angle) => void openStudio(id, angle)} />
        : displayed.page === "drafts" ? <SavedDrafts drafts={drafts} sample={sample} />
          : showWelcome ? <Welcome publicDemo={publicDemo} onSample={startSample} onConnect={() => openConnections("email")} onPaste={() => show("paste")} />
          : <Inbox items={items} selected={selected} sample={sample}
              ready={new Set(items.filter((item) => drafts[item.releaseId]).map((item) => item.releaseId))}
              generating={action === "generate"}
              onSelect={(id) => updateSession((current) => ({ ...current, selected: id }))}
              publicDemo={publicDemo} onConnect={() => openConnections("email")} onPaste={() => show("paste")}
              onSample={startSample} onDraft={(id) => void openStudio(id)} />}

      <Dialog open={overlay === "paste"} onOpenChange={(open) => { if (!open) show(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Paste a release link</DialogTitle><DialogDescription>Add one of the three Zernio announcements to your inbox.</DialogDescription></DialogHeader>
          <form onSubmit={(event) => { event.preventDefault(); importLink(); }} className="overlay-form">
            <label htmlFor="release-url">Release URL</label>
            <Input autoFocus id="release-url" type="url" required value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="https://zernio.com/blog/…" />
            {dialogNotice ? <p role="status" className="overlay-muted">{dialogNotice}</p> : null}
            <DialogFooter><Button type="submit" variant="brand"><Link2 data-icon="inline-start" />Add release</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "workspace"} onOpenChange={(open) => { if (!open) show(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{publicDemo ? "Public demo" : "Demo workspace"}</DialogTitle><DialogDescription>{publicDemo ? "Explore sample releases and rehearse a LinkedIn save." : "Rehearse with sample releases, or work with your connected accounts."}</DialogDescription></DialogHeader>
          <div className="overlay-form">
            {!publicDemo ? <>
              {sample ? <Button variant="outline" disabled={action !== null} onClick={() => switchWorkspace(false)}>Use my workspace</Button>
                : <Button variant="outline" disabled={action !== null} onClick={() => switchWorkspace(true)}>Load sample workspace</Button>}
              <Button variant="outline" onClick={() => openConnections("linkedin")}>LinkedIn connections</Button>
              <Button variant="outline" onClick={openInboxSettings}><Settings2 data-icon="inline-start" />Inbox settings</Button>
            </> : null}
            <Button variant="outline" onClick={openWritingSettings}><Pencil data-icon="inline-start" />Writing settings</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "writing-settings"} onOpenChange={(open) => { if (!open) show(null); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Writing settings</DialogTitle>
            <DialogDescription>These preferences apply to new AI drafts and are saved in this tab.</DialogDescription>
          </DialogHeader>
          <form className="overlay-form" onSubmit={(event) => {
            event.preventDefault();
            updateSession((current) => ({ ...current, ...writingInput }));
            show(null);
          }}>
            <label htmlFor="writing-instructions">Writing instructions <span className="overlay-muted">(optional)</span></label>
            <Textarea id="writing-instructions" rows={3} maxLength={writingInstructionsLimit} className="field-sizing-fixed"
              placeholder="Write for agency owners. Use short paragraphs and a warm, direct tone."
              value={writingInput.writingInstructions} onChange={(event) => setWritingInput({ ...writingInput, writingInstructions: event.target.value })} />
            <label htmlFor="writing-sample">Your writing sample <span className="overlay-muted">(optional)</span></label>
            <Textarea id="writing-sample" rows={3} maxLength={700} className="field-sizing-fixed"
              placeholder="Paste a few lines from a post you wrote."
              value={writingInput.writingSample} onChange={(event) => setWritingInput({ ...writingInput, writingSample: event.target.value })} />
            {sample && !publicLiveDrafting ? <p className="overlay-muted">This demo currently uses prewritten copy.</p> : null}
            {publicLiveDrafting ? <p className="overlay-muted">Your preferences are sent to OpenRouter when you create an AI draft.</p> : null}
            <DialogFooter><Button type="submit" variant="brand">Save writing settings</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "inbox-settings"} onOpenChange={(open) => { if (!open) show(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inbox settings</DialogTitle>
            <DialogDescription>Choose which senders can appear in your launch inbox.</DialogDescription>
          </DialogHeader>
          <form className="overlay-form" onSubmit={(event) => { event.preventDefault(); saveInboxSettings(); }}>
            <label htmlFor="sender-domains">Allowed sender domains</label>
            <Textarea id="sender-domains" rows={3} maxLength={2600} placeholder="zernio.com" autoCapitalize="none" spellCheck={false}
              aria-describedby={dialogNotice ? "sender-domain-help sender-domain-error" : "sender-domain-help"} aria-invalid={dialogNotice ? true : undefined}
              value={domainInput} onChange={(event) => { setDomainInput(event.target.value); setDialogNotice(""); }} />
            <p id="sender-domain-help" className="overlay-muted">Separate domains with commas or new lines. Add subdomains separately. Leave blank to allow any sender domain.</p>
            {dialogNotice ? <p id="sender-domain-error" className="overlay-muted" role="alert">{dialogNotice}</p> : null}
            <DialogFooter><Button type="submit" variant="brand">Save inbox settings</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "connect"} onOpenChange={(open) => { if (!open && action !== "mail") show(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{connectFor === "email" ? "Connect email" : "Connect LinkedIn"}</DialogTitle>
            <DialogDescription>{connectFor === "email" ? "Choose a mailbox connected through Zernio." : "Choose where to save your LinkedIn draft."}</DialogDescription>
          </DialogHeader>
          <div className="overlay-form">
            {connectFor === "email" && allowedDomains.length > 0 ? <p className="overlay-muted">Sender filter active · {allowedDomains.length} allowed {allowedDomains.length === 1 ? "domain" : "domains"}</p> : null}
            {loadingConnections ? <p className="connection-loading"><LoaderCircle className="animate-spin motion-reduce:animate-none" />Checking Zernio connections…</p> : null}
            {connectFor === "email" ? connections.mail.map((account) =>
              <Button key={account.id} variant="outline" disabled={action !== null} onClick={() => void importMail(account.id)}>
                <Mail data-icon="inline-start" />{action === "mail" ? "Reading launch emails…" : `Read from ${account.provider} · ${account.label}`}
              </Button>
            ) : connections.linkedin.map((account) =>
              <Button key={account.id} variant="outline" onClick={() => { setTargetId(account.id); show(null); }}>{account.label}</Button>
            )}
            <p className="overlay-muted">
              {connections.configured ? "Connect or manage accounts in Zernio, then refresh here." : "Set a Zernio API key in this app to use connected accounts."}
            </p>
            {dialogNotice ? <p className="overlay-muted" role="status">{dialogNotice}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => void refreshConnections()} disabled={loadingConnections || action === "mail"}>Refresh connections</Button>
            <Button asChild variant="brand"><a href="https://zernio.com/dashboard" target="_blank" rel="noreferrer">Open Zernio<ExternalLink data-icon="inline-end" /></a></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={overlay === "email" || overlay === "source"} onOpenChange={(open) => { if (!open) show(null); }}>
        <SheetContent className="source-sheet">
          <SheetHeader>
            <SheetTitle>{overlay === "source" ? (draft?.writingSample ? "Your writing sample" : source?.title || "Writing sample") : studioItem?.subject || "Launch source"}</SheetTitle>
            <SheetDescription>{overlay === "source" ? (draft?.writingSample ? "Added in your workspace" : `Sample writing · ${source?.date || ""}`) : "Release source for both drafts"}</SheetDescription>
          </SheetHeader>
          <div className="sheet-body">
            {overlay === "source" ? <blockquote>“{draft?.writingSample || source?.excerpt}”</blockquote>
              : studioItem ? <AnnouncementBody item={studioItem} /> : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "This request couldn’t be completed.";
}
