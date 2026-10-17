import { ZodError } from "zod";

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Maps thrown errors to a response without leaking keys or stack traces. */
export function errorResponse(err: unknown, fallback: string): Response {
  if (err instanceof ZodError) return jsonError(err.issues[0]?.message ?? "Invalid request.", 400);
  const message = err instanceof Error ? err.message : String(err);
  if (/API_KEY is not set/.test(message)) return jsonError(message, 500);
  if (/401|unauthor|invalid api key|authentication/i.test(message)) {
    return jsonError("The API key was rejected. Check the key in .env.local.", 502);
  }
  console.error(fallback, err);
  return jsonError(fallback, 502);
}
