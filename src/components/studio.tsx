"use client";

import { useState } from "react";
import { ArrowRight, Check, CircleCheck, ExternalLink, LoaderCircle, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, ChannelIcon } from "./chrome";
import type { DraftState } from "@/lib/session";
import { releases, type ReleaseId } from "@/lib/releases";

type Props = {
  id: ReleaseId;
  draft: DraftState;
  author: string;
  account?: string;
  sample: boolean;
  saving: boolean;
  onEdit: (channel: "linkedin" | "x", value: string) => void;
  onSource: () => void;
  onEmail: () => void;
  onSave: () => void;
  onConnect: () => void;
};

export function Studio({ id, draft, author, account, sample, saving, onEdit, onSource, onEmail, onSave, onConnect }: Props) {
  const [editing, setEditing] = useState<"linkedin" | "x" | null>(null);
  const [selected, setSelected] = useState(true);
  const release = releases[id];
  const receipt = draft.receipt;
  const openingMatches = draft.linkedin.startsWith(draft.generated.opening);
  const sourceText = draft.writingSample || release.sample?.excerpt;
  const sourceLabel = draft.writingSample ? "Inspired by your writing sample"
    : sample && draft.generated.source === "sample" && release.sample ? `Inspired by your ${release.sample.date} post` : "Inspired by a writing sample";
  const initials = author.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <main className="studio">
      <div className="studio-context">
        <div className="breadcrumb"><a href="#inbox">Inbox</a><span>/</span><strong>{release.title}</strong></div>
        <Button variant="ghost" onClick={onEmail} className="context-action">View launch source <ExternalLink data-icon="inline-end" /></Button>
      </div>
      <h1>Review your drafts</h1>
      <div className="studio-author"><Avatar initials={initials} /><strong>{author}</strong>
        {draft.generated.source === "sample" ? <Badge variant="secondary">Sample copy</Badge> : null}
      </div>
      <section aria-labelledby="linkedin-heading" className="channel-section">
        <div className="channel-header">
          <ChannelIcon channel="LinkedIn" /><h2 id="linkedin-heading">LinkedIn</h2>
          <span className="channel-identity">{account || (sample ? "Alex Rivera" : "Choose an account to save")}</span>
          {receipt ? <Badge variant="outline"><Check data-icon="inline-start" />{receipt.mode === "zernio" ? "Saved to Zernio" : "Saved in rehearsal"}</Badge>
            : <Button variant="outline" aria-label={editing === "linkedin" ? "Done editing LinkedIn" : "Edit LinkedIn draft"} onClick={() => setEditing(editing === "linkedin" ? null : "linkedin")}><Pencil data-icon="inline-start" />{editing === "linkedin" ? "Done" : "Edit"}</Button>}
        </div>
        <div className="source-layout">
          {editing === "linkedin" && !receipt ? <Textarea autoFocus aria-label="LinkedIn draft" rows={5} maxLength={3000} className="editor-field" value={draft.linkedin} onChange={(event) => onEdit("linkedin", event.target.value)} />
            : <p className="draft-copy">{openingMatches && sourceText ? <><mark>{draft.generated.opening}</mark>{draft.linkedin.slice(draft.generated.opening.length)}</> : draft.linkedin}</p>}
          {sourceText ? (
            <button className="source-note" onClick={onSource} aria-label={`View source: ${sourceLabel}`}>
              <strong>{sourceLabel}</strong><span>“{sourceText}”</span>
            </button>
          ) : null}
        </div>
      </section>
      <section aria-labelledby="x-heading" className="channel-section">
        <div className="channel-header">
          <ChannelIcon channel="X" /><h2 id="x-heading">X</h2>
          <span className="channel-identity">{sample ? "@alex" : "Draft for X"}</span>
          <Button variant="outline" aria-label={editing === "x" ? "Done editing X" : "Edit X draft"} onClick={() => setEditing(editing === "x" ? null : "x")}><Pencil data-icon="inline-start" />{editing === "x" ? "Done" : "Edit"}</Button>
          {receipt ? <Badge variant="secondary" className="x-review">For review</Badge> : null}
        </div>
        {editing === "x" ? <Textarea autoFocus aria-label="X draft" rows={3} maxLength={280} className="editor-field" value={draft.x} onChange={(event) => onEdit("x", event.target.value)} />
          : <p className="draft-copy x-copy">{draft.x}</p>}
      </section>
      {receipt ? (
        <section className="save-receipt" aria-label="Save result">
          <CircleCheck className="receipt-icon" aria-hidden="true" />
          <div role="status"><h2>{receipt.mode === "zernio" ? "LinkedIn draft saved to Zernio" : "LinkedIn draft saved in rehearsal"}</h2><p>Your X draft is still here for review.</p></div>
          <Button asChild variant="brand" className="primary-button"><a href="#drafts">View saved drafts</a></Button>
        </section>
      ) : (
        <div className="studio-footer">
          <fieldset className="channel-selection">
            <legend className="sr-only">Save to Zernio</legend>
            <strong>{sample ? "Rehearsal save" : "Save to Zernio"}</strong>
            <label><Checkbox checked={selected} disabled={saving} onCheckedChange={(value) => setSelected(value === true)} /> LinkedIn</label>
            <label title="The X draft stays in the studio"><Checkbox checked={false} disabled /> X</label>
          </fieldset>
          <Button variant="brand" className="primary-button" disabled={!selected || !draft.linkedin.trim() || saving} onClick={sample || account ? onSave : onConnect}>
            {saving ? "Saving to Zernio…" : sample ? "Rehearse LinkedIn save" : account ? "Save LinkedIn draft" : "Connect LinkedIn"}
            {saving ? <LoaderCircle data-icon="inline-end" className="animate-spin motion-reduce:animate-none" /> : <ArrowRight data-icon="inline-end" />}
          </Button>
        </div>
      )}
    </main>
  );
}
