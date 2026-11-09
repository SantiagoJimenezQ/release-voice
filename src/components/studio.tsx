"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { ArrowRight, CalendarDays, CircleCheck, ExternalLink, LoaderCircle, Pencil, UserRound, X } from "lucide-react";
import { Tabs } from "radix-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChannelIcon } from "./chrome";
import { releaseExcerpts } from "@/lib/release-excerpts";
import { releases, type ReleaseId } from "@/lib/releases";
import { calendarHref } from "@/lib/session";
import {
  angleDraft, angleTitle, defaultRehearsal, draftAngles, formatRehearsal, formatRehearsalDate, recommendedAngles, rehearsalFieldsSchema, rehearsalTimeZones,
  type Channel, type DraftAngle, type DraftState, type DraftVariant, type RehearsalFields,
} from "@/lib/studio-drafts";

const channels = { linkedin: "LinkedIn", x: "X" } as const;
type PanelKind = "schedule" | "source";

type Props = {
  id: ReleaseId;
  angle: DraftAngle;
  focusChannel?: Channel;
  draft: DraftState;
  author: string;
  account?: string;
  sample: boolean;
  saving: boolean;
  onAngleChange: (angle: DraftAngle) => void;
  onEdit: (channel: Channel, value: string) => void;
  onSource: () => void;
  onEmail: () => void;
  onSave: () => void;
  onSchedule: (channel: Channel, fields: RehearsalFields) => void;
};

export function Studio({ id, angle, focusChannel, draft, author, account, sample, saving, onAngleChange, onEdit, onSource, onEmail, onSave, onSchedule }: Props) {
  const [editing, setEditing] = useState<Channel | null>(null);
  const [panel, setPanel] = useState<{ kind: PanelKind; angle: DraftAngle; channel: Channel } | null>(null);
  const panelTrigger = useRef<HTMLButtonElement | null>(null);
  const release = releases[id];
  const recommendation = recommendedAngles[id];
  const current = angleDraft(id, angle, draft);
  const activePanel = panel?.angle === angle ? panel : null;
  const scheduleChannel = activePanel?.kind === "schedule" ? activePanel.channel : null;
  const example = angle !== "original" || draft.generated.source === "sample";
  const receipt = current.receipt;
  const hasWritingSource = angle === "original" && (draft.writingSample || (sample && example && release.sample));

  function closePanel() {
    setPanel(null);
    panelTrigger.current?.focus();
  }

  function togglePanel(event: MouseEvent<HTMLButtonElement>, kind: PanelKind, channel: Channel) {
    if (activePanel?.kind === kind && activePanel.channel === channel) {
      closePanel();
      return;
    }
    panelTrigger.current = event.currentTarget;
    setPanel({ kind, angle, channel });
  }

  return (
    <main className={activePanel ? "studio-workspace studio-workspace-with-panel" : "studio-workspace"}>
      <div className="studio">
        <header className="studio-heading">
          <div className="studio-context">
            <div className="breadcrumb"><a href="#inbox">Inbox</a><span aria-hidden="true">/</span><span>Writing Studio</span></div>
            <Button variant="ghost" onClick={onEmail} className="context-action">View release <ExternalLink data-icon="inline-end" /></Button>
          </div>
          <h1>{release.title}</h1>
          <p className="studio-byline">{author} · {example ? "Sample drafts" : "Personalized drafts"}</p>
          <div className="studio-angle">
            <strong>{sample ? "Your angle" : "Suggested angle"}</strong>
            <span>{id === "approvals" && sample ? "Let AI write the draft. Let people decide what goes out." : release.angle}</span>
          </div>
        </header>
        <Tabs.Root value={angle} activationMode="manual" onValueChange={(value) => {
          const next = draftAngles.find((candidate) => candidate === value);
          if (!next || next === angle) return;
          setEditing(null);
          setPanel(null);
          onAngleChange(next);
        }}>
          <Tabs.List aria-label="Draft angles" className="studio-tabs">
            {draftAngles.map((value) => <Tabs.Trigger className="studio-tab" key={value} value={value}>{angleTitle(id, value, draft)}</Tabs.Trigger>)}
          </Tabs.List>
          {draftAngles.map((value) => <Tabs.Content key={value} value={value} className="studio-tab-content">
            {value === angle ? <>
              <div className="studio-tab-note">
                <p><strong>Start with {angleTitle(id, recommendation.angle, draft)}.</strong> {recommendation.reason}</p>
                {hasWritingSource ? <Button variant="link" onClick={onSource}>View writing sample</Button> : null}
              </div>
              <div className="studio-cards">
                {(["linkedin", "x"] as const).map((channel) => <DraftCard key={channel}
                  channel={channel} draft={current} author={channel === "linkedin" ? account ?? author : author}
                  sample={sample} example={example} editing={editing === channel} saving={saving} focused={focusChannel === channel}
                  activePanel={activePanel?.channel === channel ? activePanel.kind : undefined}
                  onToggleEdit={() => setEditing(editing === channel ? null : channel)}
                  onEdit={(content) => onEdit(channel, content)}
                  onCheckSource={(event) => togglePanel(event, "source", channel)}
                  onSchedule={(event) => togglePanel(event, "schedule", channel)} />)}
              </div>
              {receipt ? (
                <section className="save-receipt" aria-label="Save result">
                  <CircleCheck className="receipt-icon" aria-hidden="true" />
                  <div role="status"><h2>{receipt.mode === "zernio" ? "LinkedIn draft saved to Zernio" : "LinkedIn draft saved in rehearsal"}</h2><p>Your X draft is still here for review.</p></div>
                  <Button asChild variant="outline"><a href="#drafts">View saved drafts</a></Button>
                </section>
              ) : (
                <div className="studio-footer">
                  <span>{sample ? "Save a LinkedIn draft in rehearsal." : "Save a draft to your connected LinkedIn account."}</span>
                  <Button variant="outline" disabled={!current.linkedin.trim() || saving} onClick={onSave}>
                    {saving ? "Saving to Zernio…" : sample ? "Rehearse LinkedIn save" : account ? "Save LinkedIn draft" : "Connect LinkedIn"}
                    {saving ? <LoaderCircle data-icon="inline-end" className="animate-spin motion-reduce:animate-none" /> : <ArrowRight data-icon="inline-end" />}
                  </Button>
                </div>
              )}
            </> : null}
          </Tabs.Content>)}
        </Tabs.Root>
      </div>
      {activePanel?.kind === "source" ? <ReleaseSourcePanel
        key={`${angle}/${activePanel.channel}`} id={id} angle={angle} angleLabel={angleTitle(id, angle, draft)}
        channel={activePanel.channel} onClose={closePanel} /> : null}
      {scheduleChannel ? <SchedulePanel
        key={`${angle}/${scheduleChannel}`} id={id} angle={angleTitle(id, angle, draft)} channel={scheduleChannel}
        account={scheduleChannel === "linkedin" ? account ?? author : sample ? "@alex" : author}
        schedule={current.schedules?.[scheduleChannel]} canSchedule={!saving && canScheduleDraft(scheduleChannel, current[scheduleChannel])}
        onClose={closePanel} onSubmit={(fields) => { onSchedule(scheduleChannel, fields); closePanel(); }} /> : null}
    </main>
  );
}

const draftLimits = { linkedin: 3000, x: 280 };

function canScheduleDraft(channel: Channel, content: string) {
  return Boolean(content.trim()) && content.length <= draftLimits[channel];
}

function DraftCard({ channel, draft, author, sample, example, editing, activePanel, saving, focused, onToggleEdit, onEdit, onCheckSource, onSchedule }: {
  channel: Channel;
  draft: DraftVariant;
  author: string;
  sample: boolean;
  example: boolean;
  editing: boolean;
  activePanel?: PanelKind;
  saving: boolean;
  focused: boolean;
  onToggleEdit: () => void;
  onEdit: (value: string) => void;
  onCheckSource: (event: MouseEvent<HTMLButtonElement>) => void;
  onSchedule: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const label = channels[channel];
  const content = draft[channel];
  const max = draftLimits[channel];
  const saved = channel === "linkedin" && Boolean(draft.receipt);
  const schedule = draft.schedules?.[channel];
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!focused) return;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  return (
    <section className="draft-platform" aria-labelledby={`${channel}-heading`}>
      <div className="channel-header">
        <ChannelIcon channel={label} /><h2 id={`${channel}-heading`} ref={headingRef} tabIndex={focused ? -1 : undefined}>{label}</h2>
      </div>
      <article className="draft-card" data-selected={Boolean(activePanel) || focused || undefined}>
        <div className="draft-person">
          <span className="avatar draft-avatar" aria-hidden="true"><UserRound /></span>
          <div className="draft-identity">
            <strong>{author}</strong>
            {channel === "linkedin" ? <span>{example ? (sample ? "Founder · Sample draft" : "Sample draft") : "LinkedIn draft"}</span>
              : sample ? <span>@alex</span> : null}
          </div>
        </div>
        {editing && !saved ? <Textarea autoFocus aria-label={`${label} draft`} rows={5} maxLength={max}
          className="editor-field" disabled={saving} value={content} onChange={(event) => onEdit(event.target.value)} />
          : <p className="draft-copy">{content || "No draft text yet."}</p>}
        {schedule ? <div className="draft-scheduled" role="status">
          <Badge variant="outline"><CalendarDays data-icon="inline-start" />Scheduled in rehearsal</Badge>
          <span>{formatRehearsal(schedule)}</span>
          <a href={calendarHref(schedule.date)}>View calendar</a>
        </div> : null}
        <div className="draft-card-footer">
          <div className="draft-card-meta">
            <Button variant="link" className="draft-source-link" onClick={onCheckSource}
              aria-label={`Check source for ${label} draft`} aria-expanded={activePanel === "source"}
              aria-controls={activePanel === "source" ? "draft-source" : undefined}>Check source</Button>
            {channel === "x" ? <span className="draft-count" aria-label={`${content.length} of ${max} characters`}>{content.length} / {max}</span> : null}
          </div>
          <div className="draft-card-actions">
            {!saved ? <Button variant="ghost" disabled={saving} onClick={onToggleEdit}
              aria-label={editing ? `Done editing ${label}` : `Edit ${label} draft`}><Pencil data-icon="inline-start" />{editing ? "Done" : "Edit"}</Button> : null}
            <Button variant="outline" className="draft-schedule-button" disabled={!canScheduleDraft(channel, content) || saving}
              aria-expanded={activePanel === "schedule"} aria-controls={activePanel === "schedule" ? "draft-schedule" : undefined}
              aria-label={`${schedule ? "Reschedule" : "Schedule"} ${label} draft`} onClick={onSchedule}>
              <CalendarDays data-icon="inline-start" />{schedule ? "Reschedule" : "Schedule"}
            </Button>
          </div>
        </div>
      </article>
    </section>
  );
}

function focusSourceHeading(heading: HTMLHeadingElement | null) {
  heading?.focus();
}

function ReleaseSourcePanel({ id, angle, angleLabel, channel, onClose }: {
  id: ReleaseId;
  angle: DraftAngle;
  angleLabel: string;
  channel: Channel;
  onClose: () => void;
}) {
  const release = releases[id];

  return (
    <aside id="draft-source" className="studio-panel" aria-labelledby="source-heading"
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}>
      <header className="studio-panel-header">
        <h2 id="source-heading" ref={focusSourceHeading} tabIndex={-1}>Release source</h2>
        <Button variant="ghost" size="icon" aria-label="Close source panel" onClick={onClose}><X /></Button>
      </header>
      <div className="studio-panel-target"><Badge variant="secondary">{angleLabel}</Badge><Badge variant="secondary">{channels[channel]} draft</Badge></div>
      <div className="release-source">
        <p className="release-source-meta">Zernio blog · {release.date}</p>
        <h3>{release.article}</h3>
        {releaseExcerpts(id, angle).map(({ heading, quote }) => (
          <figure key={heading} className="release-excerpt">
            <figcaption>{heading}</figcaption>
            <blockquote cite={release.url}>“{quote}”</blockquote>
          </figure>
        ))}
        <Button asChild variant="outline"><a href={release.url} target="_blank" rel="noopener noreferrer">
          Read full release <ExternalLink data-icon="inline-end" />
        </a></Button>
      </div>
    </aside>
  );
}

function SchedulePanel({ id, angle, channel, account, schedule, canSchedule, onClose, onSubmit }: {
  id: ReleaseId;
  angle: string;
  channel: Channel;
  account: string;
  schedule?: RehearsalFields;
  canSchedule: boolean;
  onClose: () => void;
  onSubmit: (fields: RehearsalFields) => void;
}) {
  const [editingSlot, setEditingSlot] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const slot = schedule ?? defaultRehearsal(id);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function cancelChange() {
    setEditingSlot(false);
    headingRef.current?.focus();
  }

  function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitted = rehearsalFieldsSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (submitted.success && canSchedule) onSubmit(submitted.data);
  }

  return (
    <aside id="draft-schedule" className="studio-panel" aria-labelledby="schedule-heading"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        if (editingSlot) cancelChange();
        else onClose();
      }}>
      <header className="studio-panel-header">
        <div>
          <h2 id="schedule-heading" ref={headingRef} tabIndex={-1}>{schedule ? "Scheduled draft" : "Schedule draft"}</h2>
          <p>Demo calendar only</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close scheduling panel" onClick={onClose}><X /></Button>
      </header>
      <div className="studio-panel-target"><Badge variant="secondary">{angle}</Badge><Badge variant="secondary">{channels[channel]} · {account}</Badge></div>
      {editingSlot ? (
        <form className="schedule-form" onSubmit={saveChanges}>
          <label htmlFor="schedule-date">Date
            <Input id="schedule-date" name="date" autoFocus type="date" required min="0001-01-01" max="9999-12-31" defaultValue={slot.date} />
          </label>
          <div className="schedule-time">
            <label htmlFor="schedule-time">Time
              <Input id="schedule-time" name="time" type="time" required defaultValue={slot.time} />
            </label>
            <label htmlFor="schedule-zone">Time zone
              <select id="schedule-zone" name="timeZone" defaultValue={slot.timeZone}>
                {rehearsalTimeZones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
              </select>
            </label>
          </div>
          <div className="schedule-actions">
            <Button type="button" variant="outline" onClick={cancelChange}>Cancel changes</Button>
            <Button type="submit" variant="brand" disabled={!canSchedule}>{schedule ? "Save new slot" : "Schedule in demo"}</Button>
          </div>
        </form>
      ) : (
        <div className="schedule-form">
          <div className="schedule-summary">
            <CalendarDays aria-hidden="true" />
            <div>
              <h3>{schedule ? "Scheduled slot" : "Suggested slot"}</h3>
              <p>{formatRehearsalDate(slot.date)}</p>
              <p>{slot.time} · {slot.timeZone}</p>
            </div>
            <Button variant="outline" aria-label={schedule ? "Change scheduled slot" : "Change suggested slot"} onClick={() => setEditingSlot(true)}>Change</Button>
          </div>
          {!schedule ? <div className="schedule-actions">
            <Button variant="brand" disabled={!canSchedule} onClick={() => onSubmit(slot)}>Schedule in demo</Button>
          </div> : null}
        </div>
      )}
    </aside>
  );
}
