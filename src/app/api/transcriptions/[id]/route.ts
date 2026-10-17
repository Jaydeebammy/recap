import type { NextRequest } from "next/server";
import { getTranscription } from "@/lib/assemblyai";
import { errorResponse, jsonError } from "@/lib/http";
import { transcriptIdSchema } from "@/lib/validation";

/** Poll a transcription. Returns its status, and the speaker turns once completed. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/transcriptions/[id]">) {
  const parsed = transcriptIdSchema.safeParse((await ctx.params).id);
  if (!parsed.success) return jsonError("Invalid transcript id.", 400);
  try {
    return Response.json(await getTranscription(parsed.data), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err, "Couldn't check the transcription status.");
  }
}
