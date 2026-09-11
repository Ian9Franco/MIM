/** Desktop-local origin/host check shared by inspect and deploy. */
export function rejectIfNotDesktopLocal(request: Request, error: string): Response | null {
  const url = new URL(request.url);
  // Next may normalize request.url to localhost even when the browser uses 127.0.0.1.
  const authority = request.headers.get("host") || url.host;
  const localUrl = new URL(`${url.protocol}//${authority}`);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(localUrl.hostname);
  const desktop = process.env.MIM_DESKTOP_RUNTIME === "1" || process.env.NODE_ENV === "development";
  if (!desktop || !local || request.headers.get("origin") !== localUrl.origin) {
    return Response.json({ error }, { status: 403 });
  }
  return null;
}
