"use client";

import { Check, FileText, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { releaseIds, releases } from "@/lib/releases";
import { studioHref } from "@/lib/session";
import { angleDraft, angleTitle, draftAngles, type DraftState } from "@/lib/studio-drafts";
import { ChannelIcon } from "./chrome";

export function SavedDrafts({ drafts, sample }: { drafts: Partial<Record<(typeof releaseIds)[number], DraftState>>; sample: boolean }) {
  const [search, setSearch] = useState("");
  const records = releaseIds.flatMap((id) => {
    const draft = drafts[id];
    if (!draft) return [];
    return draftAngles.flatMap((angle) => {
      const { receipt } = angleDraft(id, angle, draft);
      return receipt ? [{ id, angle, title: angleTitle(id, angle, draft), receipt }] : [];
    });
  });
  const filtered = records.filter(({ id, title, receipt }) => `${releases[id].title} ${title} ${receipt.content}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <main className="surface saved-surface">
      <header className="page-heading">
        <div><h1>Saved drafts</h1><p>{sample ? "Drafts saved in this rehearsal" : "Drafts saved to your connected accounts"}</p></div>
        {records.length ? <div className="draft-search"><Search aria-hidden="true" /><Input aria-label="Search drafts" placeholder="Search drafts" value={search} onChange={(event) => setSearch(event.target.value)} /></div> : null}
      </header>
      {filtered.length ? (
        <div className="saved-groups">
          {filtered.map(({ id, angle, title, receipt }) => (
            <article className="saved-group" key={`${id}/${angle}`}>
              <header><div><h2>{releases[id].title}</h2><p>{title} · {releases[id].date} release</p></div>
                <Badge variant="outline"><Check data-icon="inline-start" />{receipt.mode === "zernio" ? "Saved to Zernio" : "Saved in rehearsal"}</Badge></header>
              <div className="saved-channel">
                <span><ChannelIcon channel="LinkedIn" /><strong>LinkedIn</strong></span>
                <div><p className="saved-excerpt">{receipt.content}</p><small>{receipt.account}{receipt.mode === "zernio" ? ` · Draft ${receipt.postId}` : ""}</small></div>
                <Button variant="link" asChild><a href={studioHref(id, angle)}>Open LinkedIn draft</a></Button>
              </div>
            </article>
          ))}
        </div>
      ) : <section className="inbox-empty saved-empty">
        <span className="empty-icon"><FileText aria-hidden="true" /></span>
        <h2>{records.length ? "No matching drafts" : "No saved drafts yet"}</h2>
        <p>{records.length ? "Try a different search." : "Open a launch and save your LinkedIn draft to find it here."}</p>
        {records.length ? <Button variant="outline" onClick={() => setSearch("")}>Clear search</Button> : <Button asChild variant="brand"><a href="#inbox">Back to inbox</a></Button>}
      </section>}
    </main>
  );
}
