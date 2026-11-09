"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChannelIcon } from "./chrome";
import { releaseIds, releases, type Announcement, type ReleaseId } from "@/lib/releases";
import { goTo, studioHref } from "@/lib/session";
import { angleDraft, angleTitle, demoDate, draftAngles, type DraftAngle, type DraftState } from "@/lib/studio-drafts";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekMs = 7 * 24 * 60 * 60 * 1000;
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const dayFormat = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" });

function dateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

export function Calendar({ items, drafts, date, busy, onDraft }: {
  items: Announcement[];
  drafts: Partial<Record<ReleaseId, DraftState>>;
  date?: string;
  busy: boolean;
  onDraft: (id: ReleaseId, angle?: DraftAngle) => void;
}) {
  const week = date ? Math.floor((Date.parse(`${date}T00:00:00Z`) - demoDate(0).getTime()) / weekMs) : 0;
  const previousWeek = demoDate(0, week - 1);
  const nextWeek = demoDate(0, week + 1);
  const suggested = items.filter((item) => releases[item.releaseId].day !== null);
  const range = dateFormat.formatRange(demoDate(0, week), demoDate(6, week));
  const rehearsals = releaseIds.flatMap((id) => {
    const draft = drafts[id];
    if (!draft) return [];
    return draftAngles.flatMap((angle) => {
      const schedules = angleDraft(id, angle, draft).schedules;
      return (["linkedin", "x"] as const).flatMap((channel) => {
        const schedule = schedules?.[channel];
        return schedule ? [{ id, angle, channel, schedule, title: angleTitle(id, angle, draft) }] : [];
      });
    });
  }).sort((a, b) => a.schedule.time.localeCompare(b.schedule.time));

  return (
    <main className="surface calendar-surface">
      <header className="page-heading">
        <div><h1>Content calendar</h1><p>Suggested slots and drafts scheduled in rehearsal.</p></div>
        <div className="week-controls">
          <Button variant="outline" size="icon" aria-label="Previous week" disabled={previousWeek.getUTCFullYear() < 1}
            onClick={() => goTo({ page: "calendar", date: dateKey(previousWeek) }, false)}><ChevronLeft /></Button>
          <span aria-live="polite">{range}</span>
          <Button variant="outline" size="icon" aria-label="Next week" disabled={nextWeek.getUTCFullYear() > 9999}
            onClick={() => goTo({ page: "calendar", date: dateKey(nextWeek) }, false)}><ChevronRight /></Button>
        </div>
      </header>
      <section className="week-grid" aria-label="Weekly content calendar">
        {weekdays.map((day, index) => {
          const dayDate = demoDate(index, week);
          const item = week === 0 ? suggested.find((entry) => releases[entry.releaseId].day === index) : undefined;
          const draft = item ? drafts[item.releaseId] : undefined;
          const scheduled = rehearsals.filter(({ schedule }) => schedule.date === dateKey(dayDate));

          return <div key={day} className="day-cell">
            <h2><time dateTime={dateKey(dayDate)}>{day} {dayFormat.format(dayDate)}</time></h2>
            <div className="calendar-day-entries">
              {scheduled.map(({ id, angle, channel, schedule, title }) => {
                const platform = channel === "linkedin" ? "LinkedIn" : "X";
                return (
                  <a key={`${id}/${angle}/${channel}`} className="plan-card plan-rehearsed" href={studioHref(id, angle, channel)}>
                    <Badge variant="secondary">Rehearsed</Badge>
                    <h3>{releases[id].title}</h3>
                    <p>{title}</p>
                    <p className="plan-platform"><ChannelIcon channel={platform} />{platform}</p>
                    <p><time dateTime={`${schedule.date}T${schedule.time}`}>{schedule.time}</time> · {schedule.timeZone}</p>
                  </a>
                );
              })}
              {item ? <article className="plan-card plan-suggested">
                <Badge variant="outline"><CalendarDays data-icon="inline-start" />Suggested</Badge>
                <h3>{releases[item.releaseId].title}</h3>
                <div className="plan-channels"><Badge variant="outline"><ChannelIcon channel="LinkedIn" />LinkedIn</Badge><Badge variant="outline"><ChannelIcon channel="X" />X</Badge></div>
                <Button disabled={busy} variant="link" className="plan-action" onClick={() => onDraft(item.releaseId, draft?.receipt ? "original" : undefined)}>
                  {draft ? (draft.receipt ? "View saved draft" : "Review drafts") : "Create drafts"}
                </Button>
              </article> : null}
            </div>
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
