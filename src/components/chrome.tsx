"use client";

import { CalendarDays, ChevronDown, FileText, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { View } from "@/lib/session";

const navigation = [
  { label: "Inbox", page: "inbox", Icon: Inbox },
  { label: "Content calendar", page: "calendar", Icon: CalendarDays },
  { label: "Saved drafts", page: "drafts", Icon: FileText },
] as const;

export function Topbar({ view, sample, publicDemo, openWorkspace }: { view: View; sample: boolean; publicDemo: boolean; openWorkspace: () => void }) {
  return (
    <header className="topbar">
      <a href="#inbox" className="wordmark">
        <span className="brand-icon" aria-hidden="true" />
        Release Voice
      </a>
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
