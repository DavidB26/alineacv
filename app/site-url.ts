import { headers } from "next/headers";

const hostedOrigin = "https://alineacv-ats.apoblete-developer.chatgpt.site";

export async function getSiteOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch { /* Use the registered origin if configuration is invalid. */ }
  }
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  return hostedOrigin;
}
