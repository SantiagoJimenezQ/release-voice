import { z } from "zod";
import { releaseIdSchema, writingInstructionsSchema } from "@/lib/contracts";
import { generateDrafts } from "@/lib/generate.server";
import { boundedJson, isPublicDemo, jsonRoute, RequestError, requireGenerationOrigin } from "@/lib/http.server";
import { publicGenerationConfigured, reservePublicGeneration } from "@/lib/public-generation.server";

const body = z.object({
  releaseId: releaseIdSchema,
  sampleMode: z.boolean(),
  writingSample: z.string().trim().max(700).optional(),
  writingInstructions: writingInstructionsSchema.optional(),
}).strict();

export function POST(request: Request) {
  return jsonRoute(async () => {
    requireGenerationOrigin(request);
    const input = body.safeParse(await boundedJson(request, 10_000));
    if (!input.success) throw new RequestError("Choose a release and check your writing settings.", 400);
    const sampleMode = input.data.sampleMode || (isPublicDemo() && !publicGenerationConfigured());
    if (isPublicDemo() && !sampleMode) await reservePublicGeneration(request);
    return generateDrafts({ ...input.data, sampleMode });
  });
}
