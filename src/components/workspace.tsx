"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ExternalLink, KeyRound, Link2, LoaderCircle, Mail, Pencil, Settings2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { request } from "@/lib/client";
import { announcementSchema, connectionsSchema, draftResponseSchema, receiptSchema, senderDomainsSchema, writingInstructionsLimit, type Connections, type Receipt } from "@/lib/contracts";
import { matchRelease, releaseIds, releases, sampleAnnouncements, type Announcement, type ReleaseId } from "@/lib/releases";
import { goTo, saveSenderDomains, updateSession, useSenderDomains, useSession, useView } from "@/lib/session";
import { angleDraft, recommendedAngles, rehearsalFieldsSchema, updateAngleDraft, type Channel, type DraftAngle, type DraftState, type DraftVariant, type RehearsalFields } from "@/lib/studio-drafts";
import { createZernioClient, UnconfirmedZernioSave } from "@/lib/zernio";
import { LandingHeader, Topbar } from "./chrome";
import { AnnouncementBody, Inbox } from "./inbox";
import { Welcome } from "./welcome";
import { Calendar } from "./plan";
import { SavedDrafts } from "./saved-drafts";
import { Studio } from "./studio";

type Overlay = "workspace" | "email" | "source" | "paste" | "connect" | "zernio-key" | "inbox-settings" | "writing-settings" | null;
type Action = "generate" | "save" | "mail" | "verify-key" | null;
type ConnectionKind = "email" | "linkedin";
type Drafts = Partial<Record<ReleaseId, DraftState>>;
const emptyConnections: Connections = { configured: false, linkedin: [], mail: [] };

function linkAnnouncement(releaseId: ReleaseId): Announcement {
  return { releaseId, source: "link", subject: releases[releaseId].subject };
}

function draftBucket(publicDemo: boolean, sample: boolean) {
  return publicDemo ? "publicDrafts" : sample ? "sampleDrafts" : "drafts";
}

function copyDraftsForConnection(drafts: Drafts): Drafts {
  const copy: Drafts = {};
  for (const id of releaseIds) {
    const draft = drafts[id];
    if (!draft) continue;
    const { workflow, perspective } = draft.alternatives ?? {};
    copy[id] = {
      ...draft,
      receipt: undefined,
      attempt: undefined,
      alternatives: {
        workflow: workflow && { ...workflow, receipt: undefined, attempt: undefined },
        perspective: perspective && { ...perspective, receipt: undefined, attempt: undefined },
      },
    };
  }
  return copy;
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
  const [connectFor, setConnectFor] = useState<ConnectionKind>("email");
  const [connectAfterKey, setConnectAfterKey] = useState<ConnectionKind>();
  const [browserZernio, setBrowserZernio] = useState<ReturnType<typeof createZernioClient>>();
  const [connectedDrafts, setConnectedDrafts] = useState<Drafts>({});
  const keyInput = useRef<HTMLInputElement>(null);
  const [returnToEmail, setReturnToEmail] = useState(false);
  const [dialogNotice, setDialogNotice] = useState("");
  const busy = useRef(false);
  const sample = publicDemo ? !browserZernio : session.sample;
  const draftKey = draftBucket(publicDemo, sample);
  const drafts = browserZernio ? connectedDrafts : session[draftKey];
  const visibleMail = allowedDomains.length ? mail.filter((item) => item.senderDomain && allowedDomains.includes(item.senderDomain)) : mail;
  const samplesLoaded = publicDemo || session.samplesLoaded === true || session.sample;
  const personalItems = [...visibleMail, ...session.imported];
  const items = [...personalItems, ...(samplesLoaded ? sampleAnnouncements : [])];
  const selected = items.find((item) => item.releaseId === session.selected && item.source === session.selectedSource)
    ?? (publicDemo || sample ? sampleAnnouncements : personalItems).find((item) => item.releaseId === (session.selected ?? (publicDemo ? "approvals" : undefined)))
    ?? items[0];
  const workspaceItems = publicDemo ? items : sample ? sampleAnnouncements : personalItems;
  const calendarItems = [...new Map(workspaceItems.map((item) => [item.releaseId, item])).values()];
  const studioId = view.page === "studio" ? view.releaseId : undefined;
  const studioAngle = view.page === "studio" ? view.angle ?? recommendedAngles[view.releaseId].angle : "original";
  const draft = studioId ? drafts[studioId] : undefined;
  const variant = studioId && draft ? angleDraft(studioId, studioAngle, draft) : undefined;
  const studioItem = studioId ? (selected?.releaseId === studioId && workspaceItems.includes(selected) ? selected
    : workspaceItems.find((item) => item.releaseId === studioId)) ?? linkAnnouncement(studioId) : undefined;
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
    if (loadingConnections) return;
    setLoadingConnections(true);
    setDialogNotice("");
    try {
      setConnections(await (browserZernio ? browserZernio.connections() : request("/api/connections", connectionsSchema)));
    } catch (error) {
      setDialogNotice(message(error));
    } finally {
      setLoadingConnections(false);
    }
  }

  function openZernioKey(next?: ConnectionKind) {
    setConnectAfterKey(next);
    show("zernio-key");
  }

  function openConnections(forKind: ConnectionKind) {
    if (publicDemo && !browserZernio) {
      openZernioKey(forKind);
      return;
    }
    setConnectFor(forKind);
    show("connect");
    void refreshConnections();
  }

  async function connectZernio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const key = keyInput.current?.value.trim() ?? "";
    if (!/^[\x21-\x7e]{1,512}$/.test(key)) {
      setDialogNotice("Enter a valid Zernio API key.");
      return;
    }
    event.currentTarget.reset();
    busy.current = true;
    setAction("verify-key");
    setDialogNotice("");
    try {
      const client = createZernioClient(key, { browser: true });
      const accounts = await client.connections();
      setConnectedDrafts(copyDraftsForConnection(session.publicDrafts));
      setBrowserZernio(client);
      setConnections(accounts);
      setNotice("");
      if (connectAfterKey) {
        setConnectFor(connectAfterKey);
        show("connect");
      } else {
        show("workspace");
      }
    } catch (error) {
      setDialogNotice(message(error));
      keyInput.current?.focus();
    } finally {
      busy.current = false;
      setAction(null);
    }
  }

  function disconnectZernio() {
    if (busy.current || loadingConnections) return;
    setBrowserZernio(undefined);
    setConnectedDrafts({});
    setConnections(emptyConnections);
    setTargetId("");
    setMail([]);
    setNotice("");
    show(null);
    goTo({ page: "inbox" });
  }

  function openInboxSettings(fromEmail = false) {
    setReturnToEmail(fromEmail);
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
    show(returnToEmail ? "connect" : null);
  }

  function openWritingSettings() {
    setWritingInput({ writingInstructions: session.writingInstructions, writingSample: session.writingSample });
    show("writing-settings");
  }

  function switchWorkspace(sample: boolean) {
    updateSession((current) => ({
      ...current, sample, samplesLoaded: sample || current.samplesLoaded || current.sample,
      selected: sample ? "approvals" : personalItems[0]?.releaseId,
      selectedSource: sample ? "sample" : personalItems[0]?.source,
    }));
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
      samplesLoaded: current.samplesLoaded || current.sample,
      selected: id,
      selectedSource: "link",
      imported: [...current.imported.filter((item) => item.releaseId !== id), linkAnnouncement(id)],
    }));
    setPaste("");
    show(null);
    goTo({ page: "inbox" });
  }

  async function importMail(accountId: string) {
    if ((publicDemo && !browserZernio) || busy.current) return;
    busy.current = true;
    setAction("mail");
    setDialogNotice("");
    try {
      const query = new URLSearchParams({ accountId });
      for (const domain of allowedDomains) query.append("senderDomain", domain);
      const items = await (browserZernio ? browserZernio.readLaunchEmails(accountId, allowedDomains)
        : request(`/api/mail?${query}`, z.array(announcementSchema)));
      setMail(items);
      if (!items.length) {
        setDialogNotice(allowedDomains.length ? "No launch emails matched your allowed sender domains." : "No matching launch emails yet. You can paste a release link from the inbox.");
        return;
      }
      updateSession((current) => ({
        ...current, sample: false, samplesLoaded: current.samplesLoaded || current.sample,
        selected: items[0].releaseId, selectedSource: "email",
      }));
      show(null);
      goTo({ page: "inbox" });
    } catch (error) {
      setDialogNotice(message(error));
    } finally {
      busy.current = false;
      setAction(null);
    }
  }

  function selectAnnouncement(item: Announcement) {
    const isSample = item.source === "sample";
    updateSession((current) => ({
      ...current, sample: isSample, samplesLoaded: current.samplesLoaded || current.sample || isSample,
      selected: item.releaseId, selectedSource: item.source,
    }));
  }

  async function openStudio(id: ReleaseId, angle?: DraftAngle, item?: Announcement) {
    if (busy.current) return;
    const useSamples = item ? item.source === "sample" : session.sample;
    const destination = draftBucket(publicDemo, useSamples);
    if (item) selectAnnouncement(item);
    setNotice("");
    if ((browserZernio ? connectedDrafts : session[destination])[id]) {
      goTo({ page: "studio", releaseId: id, angle });
      return;
    }
    busy.current = true;
    setAction("generate");
    try {
      const sampleMode = publicDemo ? !publicLiveDrafting : useSamples;
      const writingSample = sampleMode ? "" : session.writingSample.trim();
      const generated = await request("/api/generate", draftResponseSchema, {
        releaseId: id,
        sampleMode,
        writingSample,
        writingInstructions: sampleMode ? undefined : session.writingInstructions.trim(),
      });
      const newDraft = {
        generated,
        linkedin: `${generated.opening}\n${generated.linkedinBody}`,
        x: generated.x,
        writingSample: generated.source === "model" && writingSample ? writingSample : undefined,
      };
      if (browserZernio) setConnectedDrafts((current) => ({ ...current, [id]: newDraft }));
      else updateSession((current) => ({ ...current, [destination]: { ...current[destination], [id]: newDraft } }));
      goTo({ page: "studio", releaseId: id, angle });
    } catch (error) {
      setNotice(message(error));
    } finally {
      busy.current = false;
      setAction(null);
    }
  }

  function changeDraft(id: ReleaseId, angle: DraftAngle, update: (current: DraftVariant) => DraftVariant) {
    const apply = (current: Drafts) => {
      const old = current[id];
      return old ? { ...current, [id]: updateAngleDraft(id, angle, old, update) } : current;
    };
    if (browserZernio) setConnectedDrafts(apply);
    else updateSession((current) => ({ ...current, [draftKey]: apply(current[draftKey]) }));
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
    if (busy.current || draft.receipt || (browserZernio && draft.attempt) || !content || content.length > 3000) return;
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
    if (!browserZernio) changeDraft(id, angle, (current) => ({ ...current, attempt }));
    try {
      const receipt = await (browserZernio ? browserZernio.saveLinkedIn(attempt) : request("/api/linkedin-draft", receiptSchema, attempt));
      if (receipt.mode !== "zernio") throw new Error("A live Zernio receipt is required.");
      changeDraft(id, angle, (current) => ({ ...current, receipt }));
    } catch (error) {
      if (error instanceof UnconfirmedZernioSave) changeDraft(id, angle, (current) => ({ ...current, attempt }));
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
      updateSession((current) => ({ ...current, selected: "approvals", selectedSource: "sample" }));
      goTo({ page: "inbox" });
    } else {
      switchWorkspace(true);
    }
  }

  return (
    <>
      {showWelcome ? <LandingHeader /> : (
        <Topbar view={displayed} sample={sample} publicDemo={publicDemo} connected={Boolean(browserZernio)} openWorkspace={() => show("workspace")} />
      )}
      {notice ? <p className="notice" role="status">{notice}</p> : null}
      {studioId && draft && variant ? (
        <Studio key={`${browserZernio ? "connected" : draftKey}/${studioId}`} id={studioId} angle={studioAngle} draft={draft}
          focusChannel={view.page === "studio" ? view.channel : undefined}
          author={sample ? "Alex Rivera" : (variant.receipt?.account || target?.label || "Your workspace")}
          account={sample ? undefined : variant.receipt?.account ?? target?.label} sample={sample} saving={action === "save"}
          saveUnconfirmed={Boolean(browserZernio && variant.attempt)}
          onAngleChange={(angle) => goTo({ page: "studio", releaseId: studioId, angle }, false)}
          onEdit={(channel, value) => { if (!busy.current) changeDraft(studioId, studioAngle, (current) => ({ ...current, [channel]: value })); }}
          onSource={() => show("source")} onEmail={() => show("email")} onSave={() => void saveDraft(studioId, studioAngle, variant)}
          onConnectZernio={publicDemo && !browserZernio ? () => openZernioKey("linkedin") : undefined}
          onSchedule={(channel, fields) => scheduleDraft(studioId, studioAngle, channel, fields)} />
      ) : displayed.page === "calendar" ? <Calendar items={calendarItems} drafts={drafts} date={displayed.date} busy={action === "generate"} onDraft={(id, angle) => void openStudio(id, angle)} />
        : displayed.page === "drafts" ? <SavedDrafts drafts={drafts} sample={sample} />
          : showWelcome ? <Welcome onSample={startSample} onConnect={() => openConnections("email")} onPaste={() => show("paste")} />
          : <Inbox items={items} selected={selected} samplesLoaded={samplesLoaded}
              isReady={(item) => Boolean((browserZernio ? connectedDrafts : session[draftBucket(publicDemo, item.source === "sample")])[item.releaseId])}
              generating={action === "generate"}
              onSelect={selectAnnouncement}
              canFilterEmail={!publicDemo || Boolean(browserZernio)} filterCount={allowedDomains.length} onFilters={() => openInboxSettings()}
              onConnect={() => openConnections("email")} onPaste={() => show("paste")}
              onSample={startSample} onDraft={(item) => void openStudio(item.releaseId, undefined, item)} />}

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
          <DialogHeader>
            <DialogTitle>{browserZernio ? "Zernio connected" : publicDemo ? "Public demo" : "Demo workspace"}</DialogTitle>
            <DialogDescription>{browserZernio ? "Your Zernio connection lasts until you reload or disconnect." : "Rehearse with sample releases, or work with your connected accounts."}</DialogDescription>
          </DialogHeader>
          <div className="overlay-form">
            {publicDemo ? browserZernio ? <>
              <Button variant="outline" disabled={action !== null} onClick={() => openConnections("linkedin")}>LinkedIn connections</Button>
              <Button variant="outline" onClick={() => openInboxSettings()}><Settings2 data-icon="inline-start" />Inbox settings</Button>
              <Button variant="outline" disabled={action !== null || loadingConnections} onClick={disconnectZernio}>Disconnect Zernio</Button>
            </> : <Button variant="outline" disabled={action !== null} onClick={() => openZernioKey()}><KeyRound data-icon="inline-start" />Connect Zernio</Button> : null}
            {!publicDemo ? <>
              {sample ? <Button variant="outline" disabled={action !== null} onClick={() => switchWorkspace(false)}>Use my workspace</Button>
                : <Button variant="outline" disabled={action !== null} onClick={() => switchWorkspace(true)}>Load sample workspace</Button>}
              <Button variant="outline" onClick={() => openConnections("linkedin")}>LinkedIn connections</Button>
              <Button variant="outline" onClick={() => openInboxSettings()}><Settings2 data-icon="inline-start" />Inbox settings</Button>
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

      <Dialog open={overlay === "inbox-settings"} onOpenChange={(open) => { if (!open) show(returnToEmail ? "connect" : null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inbox settings</DialogTitle>
            <DialogDescription>Choose which sender domains to include when you import launch emails.</DialogDescription>
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

      <Dialog open={overlay === "zernio-key"} onOpenChange={(open) => { if (!open && action !== "verify-key") show(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Zernio</DialogTitle>
            <DialogDescription>Connect a Zernio API key to import launch emails and save LinkedIn drafts. The key stays in this tab and is sent directly to Zernio.</DialogDescription>
          </DialogHeader>
          <form className="overlay-form" autoComplete="off" onSubmit={(event) => void connectZernio(event)}>
            <label htmlFor="zernio-key">Zernio API key</label>
            <Input ref={keyInput} id="zernio-key" type="password" autoComplete="off" autoCapitalize="none" spellCheck={false}
              maxLength={512} required readOnly={action === "verify-key"} aria-describedby="zernio-key-help" />
            <p className="overlay-muted" id="zernio-key-help">Use a key with access to your connected accounts. <a href="https://zernio.com/dashboard/api-keys" target="_blank" rel="noreferrer" className="underline">Manage API keys in Zernio</a>.</p>
            {dialogNotice ? <p className="overlay-muted" role="alert">{dialogNotice}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={action === "verify-key"} onClick={() => show(null)}>Continue in demo</Button>
              <Button type="submit" variant="brand" disabled={action === "verify-key"}>{action === "verify-key" ? "Checking key…" : "Connect Zernio"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={overlay === "connect"} onOpenChange={(open) => { if (!open && action !== "mail") show(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{connectFor === "email" ? "Import from email" : "Connect LinkedIn"}</DialogTitle>
            <DialogDescription>{connectFor === "email" ? "Choose a mailbox connected through Zernio." : "Choose where to save your LinkedIn draft."}</DialogDescription>
          </DialogHeader>
          <div className="overlay-form">
            {connectFor === "email" ? (
              <div className="button-row flex-wrap">
                <p className="overlay-muted">{allowedDomains.length ? `Allowed senders: ${allowedDomains.join(", ")}` : "All sender domains allowed"}</p>
                <Button variant="outline" disabled={action === "mail"} onClick={() => openInboxSettings(true)}>Edit sender filters</Button>
              </div>
            ) : null}
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
