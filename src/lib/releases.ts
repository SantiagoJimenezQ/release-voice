export const releaseIds = ["integrations", "approvals", "roundup"] as const;

export type ReleaseId = (typeof releaseIds)[number];

export type Announcement = {
  releaseId: ReleaseId;
  subject: string;
  source: "sample" | "link" | "email";
  sender?: string;
  senderDomain?: string;
  provider?: "Gmail" | "Outlook";
  message?: string;
};

export type WritingSample = { title: string; date: string; excerpt: string };

export const releases = {
  integrations: {
    title: "Google and Microsoft",
    subject: "Google and Microsoft are live",
    article: "Google and Microsoft integrations",
    url: "https://zernio.com/blog/google-microsoft-integrations",
    date: "Nov 2, 2026",
    facts: "Zernio added Google and Microsoft accounts. Developers can read Gmail and Outlook email, manage calendars, and work with Drive and OneDrive through the same API as connected social accounts.",
    angle: "Show how one release email can become a social draft through the same API.",
    treatment: "Standalone post",
    reason: "Show an inbox-to-social workflow",
    day: 1,
    sample: {
      title: "Work starts in the inbox",
      date: "Oct 19",
      excerpt: "A surprising number of workflows begin with an email.",
    },
    copy: {
      opening: "A surprising number of workflows begin with an email.",
      linkedinBody: "A launch is a good example. Marketing sends the release link, and the draft starts there.\n\nZernio now connects Gmail and Outlook alongside social accounts. A tool can read that email and save a social draft through the same API.",
      x: "Launch email in, social draft out. Zernio now connects Gmail and Outlook alongside social accounts, so one integration can handle both steps.",
    },
  },
  approvals: {
    title: "Post approvals",
    subject: "Post approvals are live",
    article: "Zernio product updates",
    url: "https://zernio.com/blog/october-29-2026-product-updates",
    date: "Oct 29, 2026",
    facts: "Zernio added post approvals. Posts that require approval wait for sign-off before scheduling. Pending posts do not publish on their own. Rejected posts go back to drafts for edits and resubmission.",
    angle: "Explain the value of a human review step before scheduling a post.",
    treatment: "One angle",
    reason: "Builds on your post about human review",
    day: 3,
    sample: {
      title: "Giving AI agents a publish button",
      date: "Oct 12",
      excerpt: "Someone should see the post before it goes out.",
    },
    copy: {
      opening: "A few weeks ago I wrote about giving AI agents a publish button.",
      linkedinBody: "My rule was simple: someone should see the post before it goes out. Zernio just shipped post approvals.",
      x: "Give an AI agent a publish button? Give a human the final say. Zernio now supports approval before scheduling.",
    },
  },
  roundup: {
    title: "Product roundup",
    subject: "Product roundup",
    article: "HubSpot, blogs and commerce updates",
    url: "https://zernio.com/blog/october-22-2026-product-updates",
    date: "Oct 23, 2026",
    facts: "Zernio added HubSpot inbox sync, Wix and Webflow support in the Blogs API, and order reads for connected Shopify and WooCommerce stores.",
    angle: "Give a short update for developers interested in inbox and commerce integrations.",
    treatment: "Held for roundup",
    reason: "Wait for a firsthand example",
    day: null,
    sample: null,
    copy: {
      opening: "A few useful updates for teams building around their inbox and storefront.",
      linkedinBody: "Zernio added HubSpot inbox sync, Wix and Webflow for the Blogs API, and order reads for Shopify and WooCommerce. The updates cover different workflows, so start with the one your team already uses.",
      x: "This Zernio roundup adds HubSpot inbox sync, Wix and Webflow blog support, and order reads for Shopify and WooCommerce.",
    },
  },
} satisfies Record<ReleaseId, {
  title: string;
  subject: string;
  article: string;
  url: string;
  date: string;
  facts: string;
  angle: string;
  treatment: string;
  reason: string;
  day: number | null;
  sample: WritingSample | null;
  copy: { opening: string; linkedinBody: string; x: string };
}>;

export const sampleAnnouncements: Announcement[] = releaseIds.map((releaseId) => ({
  releaseId,
  source: "sample",
  subject: releases[releaseId].subject,
  sender: "Marketing",
  provider: "Gmail",
  message: "Hey Alex, here’s the release link if you’d like to share it.",
}));

export function matchRelease(value: string): ReleaseId | undefined {
  try {
    const url = new URL(value.trim());
    if (url.origin !== "https://zernio.com" || url.username || url.password) return;
    const normalized = url.origin + url.pathname.replace(/\/$/, "");
    return releaseIds.find((id) => releases[id].url === normalized);
  } catch {
    return;
  }
}
