function decodeEntities(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return String(value ?? "").replace(/&(?:#(\d+)|#x([\da-f]+)|(amp|apos|gt|lt|nbsp|quot));/gi, (match, decimal, hexadecimal, name) => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
    return named[name.toLowerCase()] ?? match;
  });
}

function plainText(value) {
  return decodeEntities(String(value ?? "")
    .replace(/<(?:br|hr)\b[^>]*>/gi, "\n")
    .replace(/<\/(?:address|article|div|h[1-6]|li|main|p|section|tr)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function jobPostingFromJson(value) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = jobPostingFromJson(item);
      if (found) return found;
    }
    return null;
  }
  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (types.some((type) => String(type).toLowerCase() === "jobposting")) return value;
  for (const nested of Object.values(value)) {
    const found = jobPostingFromJson(nested);
    if (found) return found;
  }
  return null;
}

function uniqueLines(value) {
  const seen = new Set();
  return String(value ?? "").split(/\n+/).map((line) => line.trim()).filter((line) => {
    const key = line.toLowerCase();
    if (!line || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join("\n");
}

export function extractJobDescriptionFromHtml(html) {
  const source = String(html ?? "");
  const scripts = [...source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const posting = jobPostingFromJson(JSON.parse(decodeEntities(match[1]).trim()));
      if (!posting) continue;
      const organization = typeof posting.hiringOrganization === "object" ? posting.hiringOrganization?.name : posting.hiringOrganization;
      const content = uniqueLines([
        posting.title ? "Puesto: " + plainText(posting.title) : "",
        organization ? "Empresa: " + plainText(organization) : "",
        plainText(posting.description),
        plainText(posting.responsibilities),
        plainText(posting.qualifications),
        plainText(posting.skills),
        plainText(posting.experienceRequirements),
      ].filter(Boolean).join("\n"));
      if (content.split(/\s+/).length >= 20) return content.slice(0, 18_000);
    } catch {
      // Continue with the visible page content when structured data is malformed.
    }
  }

  const cleaned = source
    .replace(/<(script|style|noscript|svg|nav|footer|form)\b[\s\S]*?<\/\1>/gi, " ");
  const main = cleaned.match(/<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i)?.[1] ?? cleaned;
  return uniqueLines(plainText(main)).slice(0, 18_000);
}

export function parsePublicJobUrl(value) {
  let url;
  try {
    url = new URL(String(value ?? "").trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) return null;
  if (/^(?:0|10|127)(?:\.|$)/.test(hostname) || /^169\.254\./.test(hostname) || /^192\.168\./.test(hostname)) return null;
  const private172 = hostname.match(/^172\.(\d{1,3})\./);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return null;
  if (/^(?:::1|f[cd][\da-f:]*|fe8[\da-f][\da-f:]*)$/i.test(hostname)) return null;
  return url;
}
