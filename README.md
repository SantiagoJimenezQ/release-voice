# Release Voice

A standalone Next.js and shadcn demo for a founder reviewing a launch announcement and drafting a personal take for LinkedIn and X.

## Run

From this directory, use Node.js 22 or newer and the pinned pnpm 12.16.1.

```sh
npx --yes pnpm@12.16.1 install --frozen-lockfile
npx --yes pnpm@12.16.1 dev
```

Open http://127.0.0.1:3001. The landing page shows how one launch email becomes two drafts. **Try a sample release** opens Post approvals in the Launch inbox. Choose **Create drafts** under the release preview to open the Writing Studio. It opens the recommended angle for the release and gives a short reason below the tabs. Each angle shows editable LinkedIn and X cards. The first tab holds the original draft pair. The other two are labeled samples based on the release.

Choose **Check source** on either card to read the release excerpts for that angle in the side panel, with a link to the full Zernio article. Choose **Schedule** to use the suggested slot or **Change** its date, time, and time zone. Each platform and angle has its own slot. The **Content calendar** shows each rehearsal on its scheduled date, including weekends. Open an entry to focus that platform and angle in Writing Studio. Rehearsed schedules and draft saves stay in the browser tab.

**How it works** opens the [engineering design article](http://127.0.0.1:3001/how-it-works) with diagrams of the service boundaries and draft save flow.

## Public demo on Vercel

Import this repository as a Next.js project with the repository root as the root directory. Set `RELEASE_VOICE_MODE=public` in the Vercel project’s deployment environments. This works with automatic system environment exposure disabled. Use the same setting in `.env.local` to preview public mode on localhost.

Public mode opens on the welcome screen. The inbox shows sample announcements alongside any supported release links the visitor pastes. **Import from email** points to local setup. The public demo rehearses scheduling and LinkedIn saves in the visitor’s tab. With no credentials, it uses labeled prewritten copy. To enable personalized drafting, set these server-side variables in Vercel:

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Dedicated key for public draft generation |
| `OPENROUTER_MODEL` | Chat Completions model that supports JSON output |
| `UPSTASH_REDIS_REST_URL` | HTTPS URL for the shared rate limiter |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST token with write access |

The limiter reserves up to six generation requests per ten-minute bucket and 120 requests per UTC day across the deployment. Requests with a verified Vercel IP use a keyed hash in the visitor counter. Other requests use a shared bucket. If Redis cannot confirm a reservation, the app returns an error before calling OpenRouter. Public mode blocks live Zernio account discovery, email reads, and draft saves at the API routes.

## Live local mode

Copy `.env.example` to this app’s private `.env.local`, configure the server-side keys, and start the app on loopback.

1. Connect a personal LinkedIn account in the Zernio workspace for the API key. If multiple profiles are connected, choose the exact destination in the studio or pin it with `LAUNCH_NOTES_LINKEDIN_ACCOUNT_ID`.
2. Add a release from samples, a pasted link, or email. To import mail, connect Gmail or Outlook in Zernio, choose **Import from email**, and select the mailbox. Live mail is fetched only when you choose a mailbox. **Paste a release link** accepts any of the three supplied Zernio URLs. The inbox labels the source of each release and keeps samples alongside imported emails and links.
3. Choose **Create drafts**. With OpenRouter configured, the model writes the original LinkedIn and X drafts from public release facts and any preferences you save under **Demo workspace → Writing settings**. Without OpenRouter, the app labels the supplied example copy.
4. Review both channels in the selected angle. **Save LinkedIn draft** sends one LinkedIn target and `isDraft: true` to Zernio. The receipt appears after Zernio confirms the draft, and the X copy remains editable. **Saved drafts** shows the confirmed provider draft ID. The scheduling panel records a rehearsal in the tab in this mode as well.

Use **Sender filters** in the inbox or **Edit sender filters** before choosing a mailbox. Enter up to ten allowed sender domains, separated by commas or new lines. For example, `zernio.com` accepts `team@zernio.com`. Add subdomains separately. Clear the list to allow any sender domain. This preference is saved in your browser and applies only to email.

Writing settings has separate fields for instructions and a writing sample. For example, ask for a direct tone and an agency audience, then paste a few lines of your own writing as a style reference. Release Voice sends both optional fields to OpenRouter for new AI drafts. Saved drafts retain their edits when reopened. The sample workspace uses prewritten copy.

The draft prompt takes its editorial defaults from Zernio's public release posts. It leads with a concrete change, connects it to one practical workflow, and preserves the source's exact names and limits. [Google and Microsoft integrations](https://zernio.com/blog/google-microsoft-integrations), [October 29 product updates](https://zernio.com/blog/october-29-2026-product-updates), [October 22 product updates](https://zernio.com/blog/october-22-2026-product-updates).

The blog's guides and case studies also distinguish who performs each step and support firsthand accounts with specific details. The draft prompt uses those distinctions to keep examples and personal claims grounded. [WhatsApp Coexistence guide](https://zernio.com/blog/whatsapp-coexistence), [Cross-posting case study](https://zernio.com/blog/cross-posting-machine-with-zernio).

This demo supports three Zernio releases. Suggested dates are a November 9–13, 2026 example and stay in the calendar. Browser session storage holds editable copy, optional writing preferences, and draft receipts. Fetched private email content remains in memory and stays outside the model request.

Third-party notices are included for the [Geist font](licenses/geist-OFL.txt) and [shadcn components](licenses/shadcn-MIT.txt).
The LinkedIn and X logos are sourced from [SVGL](https://github.com/pheralb/svgl). See the [SVGL license](licenses/svgl-MIT.txt).

Zernio references: [create a post](https://docs.zernio.com/posts/create-post), [connected accounts](https://docs.zernio.com/accounts/list-accounts), and [email integrations](https://zernio.com/blog/google-microsoft-integrations).
