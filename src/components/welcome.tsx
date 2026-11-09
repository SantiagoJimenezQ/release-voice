import { ArrowDown, ArrowRight, Link2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { releases } from "@/lib/releases";
import { ChannelIcon } from "./chrome";

const exampleDrafts = [
  { channel: "LinkedIn", copy: "A draft isn’t ready just because it’s written. Post approvals give your team a chance to review it." },
  { channel: "X", copy: "Draft → review → schedule. Keep the review step in Zernio." },
] as const;

export function Welcome({ publicDemo, onSample, onConnect, onPaste }: {
  publicDemo: boolean;
  onSample: () => void;
  onConnect: () => void;
  onPaste: () => void;
}) {
  return (
    <main className="surface welcome-surface">
      <div className="welcome-grid">
        <section className="welcome-intro" aria-labelledby="welcome-heading">
          <p className="welcome-kicker">From release to social</p>
          <h1 id="welcome-heading">Turn releases into posts in your voice</h1>
          <p className="welcome-description">
            Start with a launch email or link. Get LinkedIn and X drafts you can review, edit, and save.
          </p>
          <div className="welcome-start">
            <Button variant="brand" className="primary-button" onClick={onSample}>
              Try a sample release <ArrowRight data-icon="inline-end" />
            </Button>
            <p>No account needed.</p>
          </div>
        </section>

        <figure className="welcome-preview">
          <figcaption>One release, two drafts</figcaption>
          <ol className="welcome-walkthrough" role="list" aria-label="Sample walkthrough">
            <li>
              <span className="welcome-step-number" aria-hidden="true">1</span>
              <div className="welcome-example-release">
                <span><Mail aria-hidden="true" /></span>
                <div><p>Launch email from Marketing</p><strong>{releases.approvals.subject}</strong></div>
              </div>
            </li>
            <li>
              <span className="welcome-step-number" aria-hidden="true">2</span>
              <ArrowDown className="welcome-step-arrow" aria-hidden="true" />
              <div className="welcome-preview-drafts">
                {exampleDrafts.map(({ channel, copy }) => (
                  <div className="welcome-example-draft" key={channel}>
                    <div><ChannelIcon channel={channel} /><strong>{channel}</strong></div>
                    <p>{copy}</p>
                  </div>
                ))}
              </div>
            </li>
          </ol>
        </figure>
      </div>

      <section className="welcome-import" aria-labelledby="welcome-import-heading">
        <div>
          <h2 id="welcome-import-heading">Have a release to share?</h2>
          <p>{publicDemo ? "Paste a supported release link, or set up email import locally." : "Start from a link or a launch email."}</p>
        </div>
        <div className="button-row">
          <Button variant="outline" className="ui-button" onClick={onPaste}><Link2 data-icon="inline-start" />Paste a release link</Button>
          <Button variant="outline" className="ui-button" onClick={onConnect}><Mail data-icon="inline-start" />Import from email</Button>
        </div>
      </section>
    </main>
  );
}
