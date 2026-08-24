import { headers } from "next/headers";

const trustedCloudflareSuffixes = [".workers.dev", ".pages.dev"];

export async function getSiteOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) {
    const parsed = new URL(configuredUrl);
    const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
      throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.");
    }
    return parsed.origin;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const hostname = new URL(`https://${host}`).hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocal) return `http://${host}`;
  if (trustedCloudflareSuffixes.some((suffix) => hostname.endsWith(suffix))) {
    return `https://${host}`;
  }

  throw new Error("NEXT_PUBLIC_SITE_URL is required for non-Cloudflare domains.");
}
