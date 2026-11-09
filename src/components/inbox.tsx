"use client";

import { ArrowRight, ExternalLink, Inbox as InboxIcon, Link2, Mail, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "./chrome";
import { releases, type Announcement, type ReleaseId } from "@/lib/releases";

export function ReleaseLink({ id }: { id: ReleaseId }) {
  const release = releases[id];
  return (
    <a className="release-link" href={release.url} target="_blank" rel="noreferrer">
      <span className="release-icon"><Link2 aria-hidden="true" /></span>
      <span><strong>{release.article}</strong><small>{release.date}</small></span>
      <ExternalLink className="release-external" aria-hidden="true" />
    </a>
  );
}

export function AnnouncementBody({ item }: { item: Announcement }) {
  return (
    <>
      {item.source === "link" ? <p className="message-copy">{releases[item.releaseId].facts}</p> : (
        <>
          <div className="sender-line">
            <Avatar initials={(item.sender ?? "M").slice(0, 1).toUpperCase()} />
            <div><strong>{item.sender}</strong><span>via {item.provider}{item.source === "sample" ? " · Sample email" : ""}</span></div>
          </div>
          {item.source === "sample" ? <p className="recipient">To Alex Rivera</p> : null}
          {item.message ? <p className="message-copy">{item.message}</p> : null}
        </>
      )}
      <ReleaseLink id={item.releaseId} />
    </>
  );
}

type Props = {
  items: Announcement[];
  selected?: Announcement;
  ready: ReadonlySet<ReleaseId>;
  generating: boolean;
  publicDemo: boolean;
  onSelect: (id: ReleaseId) => void;
  onConnect: () => void;
  onPaste: () => void;
  onDraft: (id: ReleaseId) => void;
};

export function Inbox({ items, selected, ready, generating, publicDemo, onSelect, onConnect, onPaste, onDraft }: Props) {
  return (
    <main className="surface">
      <header className="page-heading">
        <div><h1>Launch inbox</h1><p>{publicDemo ? "Sample launch announcements for the public demo" : "Release announcements from your team"}</p></div>
        <div className="button-row flex-wrap">
          <Button asChild variant="ghost" className="ui-button">
            <Link id="how-it-works" href="/how-it-works" target="_blank" rel="noopener">
              How it works <ExternalLink data-icon="inline-end" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>
          </Button>
          {!publicDemo && items.length > 0 ? <Button variant="outline" className="ui-button" onClick={onPaste}><Link2 data-icon="inline-start" />Paste a release link</Button> : null}
        </div>
      </header>
      {!selected ? (
        <section className="inbox-empty">
          <span className="empty-icon"><InboxIcon aria-hidden="true" /></span>
          <h2>Add your first release</h2>
          <p>Connect Gmail or Outlook, or paste a link from Slack.</p>
          <div className="button-row">
            <Button variant="brand" className="primary-button" onClick={onConnect}>Connect email</Button>
            <Button variant="outline" className="primary-button" onClick={onPaste}>Paste a release link</Button>
          </div>
        </section>
      ) : (
        <div className="inbox-grid">
          <section aria-label="Launch emails" className="announcement-list">
            <h2>{items.length} {items.length === 1 ? "announcement" : "announcements"}</h2>
            {items.map((item) => {
              const active = selected.releaseId === item.releaseId;
              const release = releases[item.releaseId];
              return <button className="announcement-row" key={item.releaseId} aria-pressed={active} onClick={() => onSelect(item.releaseId)}>
                <Mail aria-hidden="true" />
                <span><strong>{item.subject}</strong>
                  {ready.has(item.releaseId) ? <Badge variant="secondary">Drafts ready</Badge>
                    : release.day === null ? <Badge variant="secondary">Held for roundup</Badge> : null}
                </span>
                <time>{release.date.split(",")[0]}</time>
              </button>;
            })}
          </section>
          <article className="reading-pane">
            <h2>{selected.subject}</h2>
            <AnnouncementBody item={selected} />
            <div className="inbox-action">
              <Button className="primary-button" variant="brand" disabled={generating} onClick={() => onDraft(selected.releaseId)}>
                {generating ? "Preparing drafts…" : ready.has(selected.releaseId) ? "Review drafts" : "Draft my take"}
                {generating ? <LoaderCircle data-icon="inline-end" className="animate-spin motion-reduce:animate-none" /> : <ArrowRight data-icon="inline-end" />}
              </Button>
              {ready.has(selected.releaseId) ? null : <p>Creates LinkedIn and X drafts.</p>}
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
