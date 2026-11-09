import { z } from "zod";
import { releaseIds } from "./releases";

export const releaseIdSchema = z.enum(releaseIds);
export const senderDomainSchema = z.string().trim().toLowerCase().max(253).regex(
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
);
export const senderDomainsSchema = z.array(senderDomainSchema).max(10);
export const writingInstructionsLimit = 800;
export const writingInstructionsSchema = z.string().max(writingInstructionsLimit);
export const announcementSchema = z.object({
  releaseId: releaseIdSchema,
  subject: z.string(),
  source: z.enum(["sample", "link", "email"]),
  sender: z.string().optional(),
  senderDomain: senderDomainSchema.optional(),
  provider: z.enum(["Gmail", "Outlook"]).optional(),
  message: z.string().optional(),
});
export const generatedSchema = z.object({
  opening: z.string().min(1).max(500),
  linkedinBody: z.string().min(1).max(2300),
  x: z.string().min(1).max(280),
});
export const draftResponseSchema = generatedSchema.extend({
  source: z.enum(["sample", "model"]),
});
export type GeneratedDraft = z.infer<typeof draftResponseSchema>;
export const receiptSchema = z.object({
  postId: z.string().min(1),
  account: z.string().min(1),
  status: z.literal("draft"),
  content: z.string().min(1).max(3000),
  mode: z.enum(["zernio", "sample"]),
});
export type Receipt = z.infer<typeof receiptSchema>;
export const accountSchema = z.object({ id: z.string().min(1), label: z.string().min(1) });
export const connectionsSchema = z.object({
  configured: z.boolean(),
  linkedin: z.array(accountSchema),
  mail: z.array(accountSchema.extend({ provider: z.enum(["Gmail", "Outlook"]) })),
});
export type Connections = z.infer<typeof connectionsSchema>;
