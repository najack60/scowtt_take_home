export const privateHeaders = { "Cache-Control": "no-store" };

export function apiError(error: string, status: number) {
  return Response.json({ error }, { status, headers: privateHeaders });
}

export function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const url = new URL(origin);
    return (url.protocol === "http:" || url.protocol === "https:")
      && url.host === host && url.origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
