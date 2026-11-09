"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, ExternalLink, Inbox as InboxIcon, Link2, LoaderCircle, Mail, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, ChannelIcon, HowItWorksLink } from "./chrome";
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

export function AnnouncementBody({ item, showLink = true }: { item: Announcement; showLink?: boolean }) {
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
      {showLink ? <ReleaseLink id={item.releaseId} /> : null}
    </>
  );
}

type Props = {
  items: Announcement[];
  selected?: Announcement;
  samplesLoaded: boolean;
  isReady: (item: Announcement) => boolean;
  generating: boolean;
  publicDemo: boolean;
  filterCount: number;
  onFilters: () => void;
  onSelect: (item: Announcement) => void;
  onConnect: () => void;
  onPaste: () => void;
  onSample: () => void;
  onDraft: (item: Announcement) => void;
};

function sourceLabel(item: Announcement) {
  return item.source === "sample" ? "Sample" : item.source === "link" ? "Pasted link" : item.provider ?? "Email";
}

export function Inbox({ items, selected, samplesLoaded, isReady, generating, publicDemo, filterCount, onFilters, onSelect, onConnect, onPaste, onSample, onDraft }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const empty = !selected;
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [empty]);

  return (
    <main className="surface launch-inbox">
      <ol className="inbox-progress" role="list" aria-label="Draft workflow">
        <li aria-current="step"><span aria-hidden="true">1</span>Pick a release</li>
        <li><span aria-hidden="true">2</span>Review drafts</li>
      </ol>
      <header className="page-heading">
        <div>
          <h1 ref={heading} tabIndex={-1}>Launch inbox</h1>
          <p>Choose a release to draft for LinkedIn and X.</p>
        </div>
        <HowItWorksLink />
      </header>
      <div className="button-row inbox-import-actions flex-wrap" role="group" aria-label="Add releases">
        <Button variant="outline" className="ui-button" disabled={generating} onClick={onConnect}><Mail data-icon="inline-start" />Import from email</Button>
        <Button variant="outline" className="ui-button" disabled={generating} onClick={onPaste}><Link2 data-icon="inline-start" />Paste a release link</Button>
        {!samplesLoaded && selected ? <Button variant="outline" className="ui-button" disabled={generating} onClick={onSample}>Load samples</Button> : null}
        {!publicDemo ? <Button variant="ghost" className="ui-button" disabled={generating} onClick={onFilters}><Settings2 data-icon="inline-start" />Sender filters{filterCount ? ` (${filterCount})` : ""}</Button> : null}
      </div>
      {selected ? (
        <div className="inbox-grid">
          <section aria-labelledby="inbox-releases" className="announcement-list">
            <div className="announcement-list-header">
              <h2 id="inbox-releases">Releases</h2>
              <Badge variant="outline" aria-label={`${items.length} ${items.length === 1 ? "release" : "releases"}`}>{items.length}</Badge>
            </div>
            {items.map((item) => {
              const active = selected.releaseId === item.releaseId && selected.source === item.source;
              const SourceIcon = item.source === "link" ? Link2 : Mail;
              return <button type="button" className="announcement-row" key={`${item.source}/${item.releaseId}`} aria-pressed={active} aria-controls="release-preview"
                disabled={generating} onClick={() => onSelect(item)}>
                <SourceIcon aria-hidden="true" />
                <span><strong>{item.subject}</strong>
                  <small>{sourceLabel(item)}</small>
                  {isReady(item) ? <Badge variant="secondary">Drafts ready</Badge> : null}
                </span>
                <time>{releases[item.releaseId].date.split(",")[0]}</time>
              </button>;
            })}
          </section>
          <ReleasePreview selected={selected} hasDrafts={isReady(selected)} generating={generating} onDraft={onDraft} />
        </div>
      ) : (
        <section className="inbox-empty launch-inbox-empty" aria-labelledby="empty-launch-inbox">
          <span className="empty-icon"><InboxIcon aria-hidden="true" /></span>
          <h2 id="empty-launch-inbox">No releases yet</h2>
          <p>Paste a release link, import a launch email, or try a sample release.</p>
          <Button variant="brand" className="primary-button" onClick={onSample}>
            Try a sample release <ArrowRight data-icon="inline-end" />
          </Button>
        </section>
      )}
    </main>
  );
}

function ReleasePreview({ selected, hasDrafts, generating, onDraft }: {
  selected: Announcement;
  hasDrafts: boolean;
  generating: boolean;
  onDraft: Props["onDraft"];
}) {
  const release = releases[selected.releaseId];

  return (
    <article id="release-preview" aria-labelledby="release-preview-heading" className="reading-pane">
      <p className="inbox-preview-label">Release preview · {sourceLabel(selected)}</p>
      <h2 id="release-preview-heading">{selected.subject}</h2>
      <p className="inbox-release-summary">{release.facts}</p>
      <div className="inbox-source">
        <a href={release.url} target="_blank" rel="noreferrer">
          Read the release <ExternalLink aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <span aria-hidden="true">·</span>
        <time>{release.date}</time>
      </div>
      <div className="inbox-action">
        <div className="inbox-action-info">
          <span role="img" aria-label="LinkedIn and X" className="inbox-action-platforms">
            <ChannelIcon channel="LinkedIn" /><ChannelIcon channel="X" />
          </span>
          <p>Review and edit both drafts in Writing Studio.</p>
        </div>
        <Button className="primary-button" variant="brand" disabled={generating} onClick={() => onDraft(selected)}>
          {generating ? "Preparing drafts…" : hasDrafts ? "Review drafts" : "Create drafts"}
          {generating ? <LoaderCircle data-icon="inline-end" className="animate-spin motion-reduce:animate-none" /> : <ArrowRight data-icon="inline-end" />}
        </Button>
      </div>
      {selected.source !== "link" ? <details key={`${selected.source}/${selected.releaseId}`} className="inbox-email-details">
        <summary>{selected.source === "sample" ? "View sample email" : "View launch email"}</summary>
        <AnnouncementBody item={selected} showLink={false} />
      </details> : null}
    </article>
  );
}
