import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowRightLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "How Release Voice works",
  description: "An engineering design brief on release intake, draft generation, and verified LinkedIn saves.",
};

export default function HowItWorksPage() {
  return (
    <>
      <header className="design-header">
        <Link className="wordmark" href="/#inbox">
          <span className="brand-icon" aria-hidden="true" />
          Release Voice
        </Link>
        <Link className="design-back" href="/#inbox"><ArrowLeft aria-hidden="true" />Launch inbox</Link>
      </header>

      <main className="design-page">
        <article aria-labelledby="design-title">
          <header className="design-intro">
            <p className="design-kicker">Engineering design brief</p>
            <h1 id="design-title">How Release Voice works</h1>
            <p>Turn a launch announcement into editable LinkedIn and X drafts. The author reviews both and decides whether to save an unpublished LinkedIn draft in Zernio.</p>
          </header>

          <section className="design-section" aria-labelledby="design-architecture">
            <h2 id="design-architecture">Architecture and data flow</h2>
            <figure className="design-figure" aria-labelledby="design-context-caption">
              <figcaption id="design-context-caption"><span>01</span> System boundaries</figcaption>
              <div className="design-topology">
                <div className="design-node">
                  <strong>Browser</strong>
                  <p>Inbox, Writing Studio, tab storage</p>
                </div>
                <ArrowRightLeft className="design-connector" aria-hidden="true" />
                <div className="design-node design-node-core">
                  <strong>Next.js API</strong>
                  <p>Input validation and server-held API keys</p>
                </div>
                <ArrowRightLeft className="design-connector" aria-hidden="true" />
                <ul className="design-providers" aria-label="External APIs called by Next.js">
                  <li className="design-node"><strong>Zernio REST</strong><p>Accounts, email reads, LinkedIn drafts</p></li>
                  <li className="design-node"><strong>OpenRouter</strong><p>Release brief and writing preferences in, draft JSON out</p></li>
                </ul>
              </div>
            </figure>
            <p><code>GET /api/mail</code> reads recent Gmail or Outlook messages through Zernio, checks any configured sender domains, and resolves a supported release URL. Pasting a release link resolves to the same release ID.</p>
            <p><code>POST /api/generate</code> looks up the curated public brief and sends it to OpenRouter with editorial guidelines and optional writing instructions or a sample. Next.js validates the LinkedIn and X response before showing it. The original email stays outside the model request.</p>
            <p>Imported mail stays in memory. Draft edits, writing preferences, and save receipts live in tab storage. Sender filters persist in browser storage.</p>
          </section>

          <section className="design-section" aria-labelledby="design-save">
            <h2 id="design-save">Draft creation and retries</h2>
            <figure className="design-figure" aria-labelledby="design-save-caption">
              <figcaption id="design-save-caption"><span>02</span> A confirmed LinkedIn save</figcaption>
              <ol className="design-sequence" role="list">
                <li className="design-node"><strong>1. Author confirms</strong><p>Save the reviewed LinkedIn copy.</p></li>
                <li className="design-node design-node-core">
                  <ArrowRight className="design-connector" aria-hidden="true" />
                  <strong>2. Server sends a draft</strong><p>Recheck the account and send one target with <code>isDraft: true</code>.</p>
                </li>
                <li className="design-node">
                  <ArrowRight className="design-connector" aria-hidden="true" />
                  <strong>3. App shows a receipt</strong><p>Verify Zernio’s draft ID, status, target, and copy.</p>
                </li>
              </ol>
              <p className="design-retry">If the response is uncertain, retrying the same account and copy reuses the original <code>Idempotency-Key</code>.</p>
            </figure>
            <p><code>POST /api/linkedin-draft</code> handles the only live write. If the request fails or the response does not match, the app keeps the edits and shows an error. The X draft remains editable in the browser.</p>
          </section>

          <section className="design-section" aria-labelledby="design-scope">
            <h2 id="design-scope">Trade-offs and verification</h2>
            <p>Three curated release briefs give the model reviewed facts to work from. Email intake reads recent matches on demand. The sample workspace uses prewritten drafts and a simulated save for rehearsal.</p>
            <p>We verified live OpenRouter generation and read back a real Zernio draft with LinkedIn as its only target. Gmail and Outlook filtering were checked against mocked responses.</p>
            <aside className="design-deployment" aria-labelledby="design-deployment-title">
              <h3 id="design-deployment-title">Public deployment</h3>
              <p>Vercel runs the sample inbox and simulated saves. The live Zernio routes require local mode and loopback access. When configured, public OpenRouter drafting checks shared per-visitor and daily quotas before making a model request.</p>
            </aside>
          </section>
        </article>
      </main>
    </>
  );
}
