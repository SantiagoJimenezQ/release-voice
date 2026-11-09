import { z } from "zod";
import { draftResponseSchema, receiptSchema } from "./contracts";
import { releases, type ReleaseId } from "./releases";

export const draftAngles = ["original", "workflow", "perspective"] as const;
export type DraftAngle = (typeof draftAngles)[number];
export type Channel = "linkedin" | "x";

export const recommendedAngles: Record<ReleaseId, { angle: DraftAngle; reason: string }> = {
  approvals: { angle: "workflow", reason: "It shows where approval fits before scheduling." },
  integrations: { angle: "workflow", reason: "It shows how a launch email becomes a social draft." },
  roundup: { angle: "perspective", reason: "It connects two updates for teams that run a storefront and a blog." },
};

export const rehearsalTimeZones = ["Europe/Madrid", "UTC", "Europe/London", "America/New_York", "America/Los_Angeles"] as const;
export const rehearsalFieldsSchema = z.object({
  date: z.iso.date(),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  timeZone: z.enum(rehearsalTimeZones),
});
const rehearsalScheduleSchema = rehearsalFieldsSchema.extend({ content: z.string().min(1).max(3000) });

const variantSchema = z.object({
  linkedin: z.string(),
  x: z.string(),
  receipt: receiptSchema.optional(),
  attempt: z.object({ requestId: z.uuid(), accountId: z.string(), content: z.string() }).optional(),
  schedules: z.object({ linkedin: rehearsalScheduleSchema.optional(), x: rehearsalScheduleSchema.optional() }).optional(),
});
export const draftStateSchema = variantSchema.extend({
  generated: draftResponseSchema,
  writingSample: z.string().optional(),
  alternatives: z.object({ workflow: variantSchema.optional(), perspective: variantSchema.optional() }).optional(),
});

export type RehearsalFields = z.infer<typeof rehearsalFieldsSchema>;
export type DraftVariant = z.infer<typeof variantSchema>;
export type DraftState = z.infer<typeof draftStateSchema>;

const examples = {
  approvals: {
    original: "Human review",
    workflow: {
      title: "Team workflow",
      linkedin: "A draft isn’t ready just because it’s written.\n\nPost approvals in Zernio give teams a chance to check the copy before it’s scheduled.",
      x: "Draft → review → schedule. Post approvals keep that review step in Zernio.",
    },
    perspective: {
      title: "Founder take",
      linkedin: "I want AI to handle the first draft and leave the final call to a person.\n\nWith post approvals in Zernio, a team can review the draft before it goes on the calendar.",
      x: "Let AI write the draft. Let people decide what goes out. Post approvals in Zernio give teams a review step before scheduling.",
    },
  },
  integrations: {
    original: "Inbox to social",
    workflow: {
      title: "Launch workflow",
      linkedin: "The launch announcement lands in email. That’s where the social draft can start.\n\nWith Gmail, Outlook and social accounts on the same Zernio API, a tool can read the announcement and prepare a draft for review.",
      x: "Read the launch email, draft a social post, then review it. Gmail, Outlook and social accounts now connect through the same Zernio API.",
    },
    perspective: {
      title: "Developer take",
      linkedin: "Connecting an inbox to the rest of a launch workflow usually means adding another integration.\n\nZernio now supports Google and Microsoft accounts alongside social accounts, so a tool can work across email and social through the same API.",
      x: "Google and Microsoft accounts now connect alongside social accounts in Zernio. One API can handle both the inbox and the social draft.",
    },
  },
  roundup: {
    original: "What changed",
    workflow: {
      title: "Inbox sync",
      linkedin: "The October roundup has one change worth checking if your team lives in its inbox.\n\nZernio added HubSpot inbox sync. Start there if HubSpot is already part of your support workflow.",
      x: "One change from the Zernio roundup for teams on HubSpot: inbox sync.",
    },
    perspective: {
      title: "Commerce and blogs",
      linkedin: "For tools that work across a storefront and a blog, two changes stand out in the Zernio roundup.\n\nThe Blogs API now supports Wix and Webflow. Connected Shopify and WooCommerce stores also support order reads.",
      x: "Two from the Zernio roundup: Wix and Webflow support in the Blogs API, plus order reads for connected Shopify and WooCommerce stores.",
    },
  },
};

export function angleTitle(id: ReleaseId, angle: DraftAngle, draft: DraftState) {
  if (angle !== "original") return examples[id][angle].title;
  return draft.generated.source === "model" ? "Your take" : examples[id].original;
}

export function angleDraft(id: ReleaseId, angle: DraftAngle, draft: DraftState): DraftVariant {
  if (angle === "original") return draft;
  const { linkedin, x } = examples[id][angle];
  return draft.alternatives?.[angle] ?? { linkedin, x };
}

export function updateAngleDraft(id: ReleaseId, angle: DraftAngle, draft: DraftState, update: (variant: DraftVariant) => DraftVariant): DraftState {
  if (angle === "original") return { ...draft, ...update(draft) };
  const variant = update(angleDraft(id, angle, draft));
  return { ...draft, alternatives: { ...draft.alternatives, [angle]: variant } };
}

export function demoDate(day: number, week = 0) {
  return new Date(Date.UTC(2026, 10, 9 + day + week * 7));
}

export function defaultRehearsal(id: ReleaseId): RehearsalFields {
  return { date: demoDate(releases[id].day ?? 3).toISOString().slice(0, 10), time: "10:00", timeZone: "Europe/Madrid" };
}

const rehearsalDateFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function formatRehearsalDate(date: string) {
  return rehearsalDateFormat.format(new Date(`${date}T00:00:00Z`));
}

export function formatRehearsal({ date, time, timeZone }: RehearsalFields) {
  return `${formatRehearsalDate(date)} · ${time} · ${timeZone}`;
}
