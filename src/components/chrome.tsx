"use client";

import { CalendarDays, ChevronDown, ExternalLink, FileText, Inbox } from "lucide-react";
import Image from "next/image";
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

export function Topbar({ view, sample, publicDemo, connected, openWorkspace }: { view: View; sample: boolean; publicDemo: boolean; connected: boolean; openWorkspace: () => void }) {
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
          {connected ? "Zernio connected" : publicDemo ? "Public demo" : sample ? "Sample workspace" : "Demo workspace"}<ChevronDown data-icon="inline-end" aria-hidden="true" />
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
  const isLinkedIn = channel === "LinkedIn";
  return (
    <span aria-hidden="true" className={cn("channel-icon", !isLinkedIn && "channel-x")}>
      <Image src={isLinkedIn ? "/icons/linkedin.svg" : "/icons/x.svg"} alt="" width={31} height={31} unoptimized />
    </span>
  );
}
