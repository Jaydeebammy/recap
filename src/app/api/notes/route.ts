import { errorResponse, jsonError } from "@/lib/http";
import { NotesError, generateNotes } from "@/lib/notes";
import { notesRequestSchema } from "@/lib/validation";

/** Turn a named transcript into summary, decisions and action items. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Send JSON with title, meetingDate and utterances.", 400);
  }
  const parsed = notesRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request.", 400);
  try {
    const notes = await generateNotes(parsed.data);
    return Response.json({ notes });
  } catch (err) {
    if (err instanceof NotesError) return jsonError(err.message, 422);
    return errorResponse(err, "Couldn't write the notes. Try again in a moment.");
  }
}
