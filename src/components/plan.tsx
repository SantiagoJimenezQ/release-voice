"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChannelIcon } from "./chrome";
import { releases, type Announcement, type ReleaseId } from "@/lib/releases";
import type { DraftState } from "@/lib/session";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const dayFormat = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" });
function dayDate(index: number, week: number) {
  return new Date(Date.UTC(2026, 10, 9 + index + week * 7));
}

export function Calendar({ items, drafts, busy, onDraft }: {
  items: Announcement[];
  drafts: Partial<Record<ReleaseId, DraftState>>;
  busy: boolean;
  onDraft: (id: ReleaseId) => void;
}) {
  const [week, setWeek] = useState(0);
  const suggested = items.filter((item) => releases[item.releaseId].day !== null);
  const featured = suggested.find((item) => item.releaseId === "approvals") ?? suggested[0];
  const range = week === 0 ? "Nov 9–13, 2026" : `${dateFormat.format(dayDate(0, week))} – ${dateFormat.format(dayDate(4, week))}`;
  const caption = items.length === 3 && suggested.length === 2
    ? "Two suggested stories from three releases"
    : items.length > 0
      ? `${suggested.length} suggested ${suggested.length === 1 ? "story" : "stories"} from ${items.length} ${items.length === 1 ? "release" : "releases"}`
      : "A suggested plan appears when you add a release.";
  return (
    <main className="surface calendar-surface">
      <header className="page-heading">
        <div><h1>Content calendar</h1><p>{caption}</p></div>
        <div className="week-controls">
          <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeek(week - 1)}><ChevronLeft /></Button>
          <span>{range}</span>
          <Button variant="outline" size="icon" aria-label="Next week" onClick={() => setWeek(week + 1)}><ChevronRight /></Button>
        </div>
      </header>
      <Badge variant="secondary" className="plan-label">Suggested plan</Badge>
      <section className="week-grid" aria-label="Suggested posting dates">
        {weekdays.map((day, index) => {
          const date = dayDate(index, week);
          const item = week === 0 ? suggested.find((entry) => releases[entry.releaseId].day === index) : undefined;
          const draft = item ? drafts[item.releaseId] : undefined;
          const active = item?.releaseId === featured?.releaseId && item !== undefined;
          return <div key={day} className="day-cell">
            <h2>{day} {dayFormat.format(date)}</h2>
            {item ? <article className={active ? "plan-card plan-featured" : "plan-card"}>
              <h3>{releases[item.releaseId].title}</h3>
              <div className="plan-channels"><Badge variant="outline"><ChannelIcon channel="LinkedIn" />LinkedIn</Badge><Badge variant="outline"><ChannelIcon channel="X" />X</Badge></div>
              <p><CalendarDays aria-hidden="true" /> Suggested date: {dateFormat.format(date)}</p>
              <Button disabled={busy} variant={active ? "brand" : "link"} className="plan-action" onClick={() => onDraft(item.releaseId)}>
                {draft ? (draft.receipt ? "View saved draft" : "Review drafts") : "Create drafts"}
                {active ? <ArrowRight data-icon="inline-end" /> : null}
              </Button>
            </article> : null}
          </div>;
        })}
      </section>
      {week === 0 && items.length > 0 ? <section className="plan-reasons">
        <h2>Why these stories</h2>
        <div className="reason-table">
          <Table><TableHeader><TableRow><TableHead>Release</TableHead><TableHead>Plan</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
            <TableBody>{items.map(({ releaseId }) => {
              const release = releases[releaseId];
              return <TableRow key={releaseId}>
                <TableCell className="font-semibold">{releaseId === "roundup" ? "Oct 23 product roundup" : release.title}</TableCell>
                <TableCell><Badge variant="secondary">{release.treatment}</Badge></TableCell>
                <TableCell>{release.reason}</TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
        </div>
      </section> : null}
    </main>
  );
}
