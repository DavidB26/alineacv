import { extractJobDescriptionFromHtml, parsePublicJobUrl } from "../../analizar-cv/job-posting.mjs";

export const runtime = "edge";

function json(body: object, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  let url = parsePublicJobUrl(body.url);
  if (!url) return json({ error: "invalid_url" }, 400);

  try {
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(8_000),
        headers: { accept: "text/html,application/xhtml+xml,text/plain;q=0.9" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        url = location ? parsePublicJobUrl(new URL(location, url).href) : null;
        if (!url) return json({ error: "unavailable" }, 422);
        continue;
      }
      if (!response.ok) return json({ error: "unavailable" }, 422);
      const contentType = response.headers.get("content-type") ?? "";
      if (!/text\/(?:html|plain)|application\/xhtml\+xml/i.test(contentType)) return json({ error: "unsupported" }, 422);
      const declaredSize = Number(response.headers.get("content-length") ?? 0);
      if (declaredSize > 2_000_000) return json({ error: "too_large" }, 422);
      const description = extractJobDescriptionFromHtml((await response.text()).slice(0, 2_000_000));
      if (description.split(/\s+/).length < 20) return json({ error: "empty" }, 422);
      return json({ description, sourceUrl: url.href });
    }
    return json({ error: "too_many_redirects" }, 422);
  } catch {
    return json({ error: "unavailable" }, 422);
  }
}
