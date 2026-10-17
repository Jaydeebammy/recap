import { cleanKeyterms, startTranscription } from "@/lib/assemblyai";
import { errorResponse, jsonError } from "@/lib/http";
import { MAX_UPLOAD_BYTES, isAudioOrVideo } from "@/lib/validation";

/** Upload a recording and queue it for transcription. Returns { id } to poll. */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Send the recording as multipart form data in a field named \"audio\".", 400);
  }
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return jsonError("Attach an audio or video file.", 400);
  if (!isAudioOrVideo(audio.type, audio.name)) return jsonError("That file isn't audio or video.", 415);
  if (audio.size > MAX_UPLOAD_BYTES) return jsonError("The file is larger than 250 MB.", 413);

  try {
    const keyterms = cleanKeyterms(form.get("keyterms")?.toString());
    const id = await startTranscription(Buffer.from(await audio.arrayBuffer()), { keyterms });
    return Response.json({ id }, { status: 202 });
  } catch (err) {
    return errorResponse(err, "Couldn't start the transcription. Try again in a moment.");
  }
}
