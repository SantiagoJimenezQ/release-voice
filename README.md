# Release Voice

A standalone Next.js and shadcn demo for a founder reviewing a launch announcement and drafting a personal take for LinkedIn and X.

## Run

From this directory, use Node.js 22 or newer and the pinned pnpm 12.16.1.

```sh
npx --yes pnpm@12.16.1 install --frozen-lockfile
npx --yes pnpm@12.16.1 dev
```

Open http://127.0.0.1:3001. **Demo workspace → Load sample workspace** loads the three example announcements and the sample founder. Rehearsal draft saves are labeled and stay in the browser tab.

**How it works** opens the [engineering design article](http://127.0.0.1:3001/how-it-works) with diagrams of the service boundaries and draft save flow.

## Public demo on Vercel

Import this repository as a Next.js project with the repository root as the root directory. Set `RELEASE_VOICE_MODE=public` in the Vercel project’s deployment environments. This works with automatic system environment exposure disabled. Use the same setting in `.env.local` to preview public mode on localhost.

Public mode starts with sample announcements and simulates LinkedIn saves in the visitor’s tab. With no credentials, it uses labeled prewritten copy. To enable personalized drafting, set these server-side variables in Vercel:

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
2. Connect Gmail or Outlook in Zernio and select **Connect email** in Release Voice to import matching launch emails. Or use **Paste a release link** with one of the three supplied Zernio URLs. Live mail is only fetched when you choose a mailbox.
3. Choose **Draft my take**. With OpenRouter configured, the model writes both variants from public release facts and any preferences you save under **Demo workspace → Writing settings**. Without OpenRouter, the app labels the supplied example copy.
4. Review both variants. **Save LinkedIn draft** sends one LinkedIn target and `isDraft: true` to Zernio. The receipt appears after Zernio confirms the draft, and the X copy remains editable. **Saved drafts** shows the confirmed provider draft ID.

In **Demo workspace → Inbox settings**, enter up to ten allowed sender domains, separated by commas or new lines. For example, `zernio.com` accepts `team@zernio.com`. Add subdomains separately. Clear the list to allow any sender domain. This preference is saved in your browser and applies to connected email imports.

Writing settings has separate fields for instructions and a writing sample. For example, ask for a direct tone and an agency audience, then paste a few lines of your own writing as a style reference. Release Voice sends both optional fields to OpenRouter for new AI drafts. Saved drafts retain their edits when reopened. The sample workspace uses prewritten copy.

The draft prompt takes its editorial defaults from Zernio's public release posts. It leads with a concrete change, connects it to one practical workflow, and preserves the source's exact names and limits. [Google and Microsoft integrations](https://zernio.com/blog/google-microsoft-integrations), [October 29 product updates](https://zernio.com/blog/october-29-2026-product-updates), [October 22 product updates](https://zernio.com/blog/october-22-2026-product-updates).

The blog's guides and case studies also distinguish who performs each step and support firsthand accounts with specific details. The draft prompt uses those distinctions to keep examples and personal claims grounded. [WhatsApp Coexistence guide](https://zernio.com/blog/whatsapp-coexistence), [Cross-posting case study](https://zernio.com/blog/cross-posting-machine-with-zernio).

This demo supports three Zernio releases. Suggested dates are a November 9–13, 2026 example and stay in the calendar. Browser session storage holds editable copy, optional writing preferences, and draft receipts. Fetched private email content remains in memory and stays outside the model request.

Third-party notices are included for the [Geist font](licenses/geist-OFL.txt) and [shadcn components](licenses/shadcn-MIT.txt).

Zernio references: [create a post](https://docs.zernio.com/posts/create-post), [connected accounts](https://docs.zernio.com/accounts/list-accounts), and [email integrations](https://zernio.com/blog/google-microsoft-integrations).
