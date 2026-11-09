import type { ReleaseId } from "./releases";
import type { DraftAngle } from "./studio-drafts";

const postApprovals = {
  heading: "Post approvals",
  quote: "Posts can now wait for approval before they're scheduled, and a pending post never publishes on its own.",
};
const emailAndSocial = {
  heading: "Google and Microsoft integrations",
  quote: "Email and calendar sit on the same API key as your social, WhatsApp, SMS and ads accounts.",
};
const inboxSync = {
  heading: "HubSpot inbox sync",
  quote: "HubSpot also started syncing your inbox",
};
const blogs = {
  heading: "Blogs API",
  quote: "Wix and Webflow joined the Blogs API",
};
const commerce = {
  heading: "Commerce API",
  quote: "list and fetch orders from a connected Shopify or WooCommerce store",
};

export function releaseExcerpts(id: ReleaseId, angle: DraftAngle) {
  switch (id) {
    case "approvals": return [postApprovals];
    case "integrations": return [emailAndSocial];
    case "roundup":
      if (angle === "workflow") return [inboxSync];
      if (angle === "perspective") return [blogs, commerce];
      return [inboxSync, blogs, commerce];
  }
}
