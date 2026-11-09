"use client";

import { CalendarDays, ChevronDown, ExternalLink, FileText, Inbox } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { View } from "@/lib/session";

const navigation = [
  { label: "Inbox", page: "inbox", Icon: Inbox },
  { label: "Content calendar", page: "calendar", Icon: CalendarDays },
  { label: "Saved drafts", page: "drafts", Icon: FileText },
] as const;

function Wordmark() {
  return (
    <a href="#home" className="wordmark">
      <span className="brand-icon" aria-hidden="true" />
      Release Voice
    </a>
  );
}

export function HowItWorksLink() {
  return (
    <Button asChild variant="ghost" className="ui-button">
      <Link id="how-it-works" href="/how-it-works" target="_blank" rel="noopener">
        How it works <ExternalLink data-icon="inline-end" aria-hidden="true" />
        <span className="sr-only"> (opens in a new tab)</span>
      </Link>
    </Button>
  );
}

export function LandingHeader() {
  return (
    <header className="landing-header">
      <Wordmark />
      <nav aria-label="Release Voice" className="button-row">
        <HowItWorksLink />
        <Button asChild variant="outline" className="ui-button">
          <a href="#inbox"><Inbox data-icon="inline-start" aria-hidden="true" />Open inbox</a>
        </Button>
      </nav>
    </header>
  );
}

export function Topbar({ view, sample, publicDemo, openWorkspace }: { view: View; sample: boolean; publicDemo: boolean; openWorkspace: () => void }) {
  return (
    <header className="topbar">
      <Wordmark />
      <nav aria-label="Workspace" className="topnav">
        {navigation.map(({ page, label, Icon }) => {
          const current = view.page === page || (page === "inbox" && view.page === "studio");
          return <a key={page} href={`#${page}`} aria-current={current ? "page" : undefined} className={cn("nav-link", current && "nav-current")}>
            <Icon aria-hidden="true" />{label}
          </a>;
        })}
      </nav>
      <div className="topbar-end">
        <Button variant="outline" className="workspace-trigger" onClick={openWorkspace}>
          {publicDemo ? "Public demo" : sample ? "Sample workspace" : "Demo workspace"}<ChevronDown data-icon="inline-end" aria-hidden="true" />
        </Button>
        <Avatar initials={sample ? "AR" : "RV"} />
      </div>
    </header>
  );
}

export function Avatar({ initials }: { initials: string }) {
  return <span className="avatar" aria-hidden="true">{initials}</span>;
}

export function ChannelIcon({ channel }: { channel: "LinkedIn" | "X" }) {
  return channel === "LinkedIn" ? (
    <span aria-hidden="true" className="channel-icon channel-linkedin">in</span>
  ) : (
    <span aria-hidden="true" className="channel-icon channel-x">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23.2 22H17l-4.9-7.4L5.6 22H2.4l8.3-9.6L.8 2h6.4l4.4 6.7L18.9 2Zm-1.1 18h1.7L6.2 4H4.4l13.4 16Z" /></svg>
    </span>
  );
}
