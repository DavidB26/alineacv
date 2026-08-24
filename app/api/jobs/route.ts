const JOBICY_ENDPOINT = "https://jobicy.com/api/v2/remote-jobs";
const MAX_ROLE_LENGTH = 100;
const MAX_SKILLS_LENGTH = 500;
const MAX_LOCATION_LENGTH = 100;
const MAX_INDUSTRY_LENGTH = 60;

type JobicyJob = {
  id?: number | string;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
};

type JobicyIndustry = {
  industrySlug?: string;
};

type RankedJob = {
  job: JobicyJob;
  score: number;
  matches: string[];
  matchedSkills: string[];
  compatibility: number;
  strongMatch: boolean;
};

const stopWords = new Set([
  "a", "al", "and", "con", "de", "del", "el", "en", "especialista", "for", "la", "las", "los", "of", "para", "the", "un", "una", "y",
  "professional", "profesional", "senior", "junior", "sr", "jr",
]);

const latinAmerica = [
  "argentina", "bolivia", "brasil", "brazil", "chile", "colombia", "costa rica", "ecuador", "el salvador", "guatemala", "honduras",
  "latam", "latin america", "latinoamerica", "latinoamérica", "mexico", "méxico", "nicaragua", "panama", "panamá", "paraguay", "peru", "perú",
  "puerto rico", "dominican republic", "república dominicana", "uruguay", "venezuela",
];

const roleAliases: Record<string, string[]> = {
  analista: ["analyst"],
  analyst: ["analista"],
  contador: ["accountant", "accounting"],
  datos: ["data"],
  desarrollador: ["developer"],
  developer: ["desarrollador", "programador"],
  disenador: ["designer", "design"],
  engineer: ["ingeniero", "desarrollador"],
  gerente: ["manager"],
  ingeniero: ["engineer"],
  manager: ["gerente"],
  programador: ["developer"],
  soporte: ["support"],
  ventas: ["sales"],
};

const genericRoleWords = new Set(["analista", "analyst", "desarrollador", "developer", "engineer", "especialista", "ingeniero", "professional", "profesional", "programador"]);
const searchTranslations: Record<string, string> = {
  contador: "accounting",
  datos: "data",
  disenador: "design",
  soporte: "support",
  ventas: "sales",
};

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": status === 200 ? "public, max-age=300, s-maxage=3600" : "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();
}

function tokens(value: string) {
  return Array.from(new Set(normalized(value).split(/\s+/).filter((token) => token.length >= 2 && !stopWords.has(token))));
}

function skillPhrases(value: string) {
  const level = /(?:b[aá]sico|intermedio|avanzado|beginner|basic|intermediate|advanced|nativo|native|fluido|fluent)/i;
  return Array.from(new Set(value
    .split(/[,;\n|•]+/)
    .map((item) => item.trim().replace(new RegExp(`\\s*(?:\\(${level.source}\\)|[-–—:]\\s*${level.source})\\s*$`, "i"), "").trim())
    .filter((item) => item.length >= 2 && item.length <= 60)))
    .slice(0, 30);
}

function phraseMatches(value: string, haystack: string) {
  const phrase = normalized(value);
  if (!phrase) return false;
  if (haystack.includes(phrase)) return true;
  const parts = tokens(value);
  return parts.length > 1 && parts.every((part) => haystack.includes(part));
}

function roleSearchTokens(value: string) {
  return Array.from(new Set(tokens(value).flatMap((token) => [token, ...(roleAliases[token] ?? [])])));
}

function jobSearchTag(role: string) {
  const values = tokens(role).reverse();
  for (const token of values) {
    const translated = searchTranslations[token];
    if (translated) return translated;
    if (!genericRoleWords.has(token) && token.length >= 3) return token;
  }
  return roleSearchTokens(role).find((token) => token.length >= 3) ?? "jobs";
}

function plainText(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&hellip;/gi, "…")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function validJobUrl(value = "") {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "jobicy.com" || url.hostname.endsWith(".jobicy.com")) ? url.href : "";
  } catch {
    return "";
  }
}

function locationIsCompatible(jobGeo = "", candidateLocation = "") {
  const geo = normalized(jobGeo);
  const location = normalized(candidateLocation);
  if (!geo || /anywhere|worldwide|global|latin america|latam/.test(geo)) return true;
  if (!location) return true;
  if (location.split(" ").some((part) => part.length > 3 && geo.includes(part))) return true;

  const candidateIsLatam = latinAmerica.some((country) => location.includes(normalized(country)));
  return candidateIsLatam && /americas|south america/.test(geo);
}

function rankJob(job: JobicyJob, role: string, skills: string, location: string): RankedJob {
  const title = normalized(job.jobTitle ?? "");
  const industries = normalized((job.jobIndustry ?? []).join(" "));
  const description = normalized(`${job.jobExcerpt ?? ""} ${job.jobDescription ?? ""}`);
  const jobText = `${title} ${industries} ${description}`;
  const roleTokens = roleSearchTokens(role).slice(0, 16);
  const skillTokens = tokens(skills).slice(0, 30);
  const candidateSkills = skillPhrases(skills);
  const matchedSkills = candidateSkills.filter((skill) => phraseMatches(skill, jobText));
  const matches = new Set<string>();
  let score = 0;
  let strongMatch = false;

  const normalizedRole = normalized(role);
  if (normalizedRole.length >= 4 && title.includes(normalizedRole)) {
    score += 24;
    strongMatch = true;
  }

  for (const token of roleTokens) {
    if (title.includes(token)) { score += 8; matches.add(token); strongMatch = true; }
    else if (industries.includes(token)) { score += 4; matches.add(token); strongMatch = true; }
    else if (description.includes(token)) { score += 2; matches.add(token); }
  }

  for (const token of skillTokens) {
    if (title.includes(token)) { score += 4; matches.add(token); strongMatch = true; }
    else if (industries.includes(token)) { score += 3; matches.add(token); strongMatch = true; }
    else if (description.includes(token)) { score += 1; matches.add(token); }
  }

  const originalRoleTokens = tokens(role).slice(0, 10);
  const roleHits = originalRoleTokens.filter((token) => {
    const alternatives = [token, ...(roleAliases[token] ?? [])];
    return alternatives.some((alternative) => jobText.includes(alternative));
  }).length;
  const roleCoverage = normalizedRole.length >= 4 && title.includes(normalizedRole)
    ? 1
    : originalRoleTokens.length > 0 ? roleHits / originalRoleTokens.length : 0;
  const skillCoverage = candidateSkills.length > 0 ? matchedSkills.length / candidateSkills.length : 0;
  const roleWeight = candidateSkills.length > 0 ? 40 : 90;
  const compatibility = Math.min(96, Math.max(0, Math.round(
    roleCoverage * roleWeight
    + skillCoverage * 50
    + (locationIsCompatible(job.jobGeo, location) ? 10 : 0),
  )));

  return {
    job,
    score,
    matches: Array.from(matches).slice(0, 5),
    matchedSkills: matchedSkills.slice(0, 5),
    compatibility,
    strongMatch,
  };
}

const jobicyFetchOptions = {
  headers: { Accept: "application/json" },
  cf: { cacheEverything: true, cacheTtl: 3600 },
} as RequestInit & { cf: { cacheEverything: boolean; cacheTtl: number } };

async function resolveJobicyIndustry(requested: string) {
  if (!requested) return "";
  const endpoint = new URL(JOBICY_ENDPOINT);
  endpoint.searchParams.set("get", "industries");
  const response = await fetch(endpoint.href, {
    ...jobicyFetchOptions,
    cf: { cacheEverything: true, cacheTtl: 86_400 },
  } as RequestInit & { cf: { cacheEverything: boolean; cacheTtl: number } });
  if (!response.ok) return "";
  const payload = await response.json() as { industries?: JobicyIndustry[] };
  const available = new Set((payload.industries ?? []).map((item) => item.industrySlug).filter((slug): slug is string => Boolean(slug)));
  return available.has(requested) ? requested : "";
}

async function loadJobicyJobs(tag: string, industry = "") {
  const endpoint = new URL(JOBICY_ENDPOINT);
  endpoint.searchParams.set("count", "100");
  if (industry) endpoint.searchParams.set("industry", industry);
  if (tag) endpoint.searchParams.set("tag", tag.slice(0, 50));
  const response = await fetch(endpoint.href, jobicyFetchOptions);
  if (!response.ok) throw new Error(`jobicy_${response.status}`);
  const payload = await response.json() as { jobs?: JobicyJob[] };
  return Array.isArray(payload.jobs) ? payload.jobs : [];
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const role = (search.get("role") ?? "").trim();
  const skills = (search.get("skills") ?? "").trim();
  const location = (search.get("location") ?? "").trim();
  const requestedIndustry = (search.get("industry") ?? "").trim();

  if (role.length < 2 || role.length > MAX_ROLE_LENGTH || skills.length > MAX_SKILLS_LENGTH || location.length > MAX_LOCATION_LENGTH || requestedIndustry.length > MAX_INDUSTRY_LENGTH || !/^[a-z-]*$/.test(requestedIndustry)) {
    return json({ error: "Búsqueda no válida.", code: "invalid_input" }, 400);
  }

  try {
    const industry = await resolveJobicyIndustry(requestedIndustry);
    const tag = jobSearchTag(role);
    let jobs = await loadJobicyJobs(tag, industry);
    if (jobs.length === 0 && industry) jobs = await loadJobicyJobs("", industry);
    const relatedJobs = jobs
      .filter((job) => validJobUrl(job.url) && job.jobTitle && job.companyName)
      .filter((job) => locationIsCompatible(job.jobGeo, location))
      .map((job) => rankJob(job, role, skills, location))
      .filter((item) => item.score > 0 && item.strongMatch)
      .sort((first, second) => second.compatibility - first.compatibility || second.score - first.score || Date.parse(second.job.pubDate ?? "") - Date.parse(first.job.pubDate ?? ""))
      .slice(0, 6)
      .map(({ job, matches, matchedSkills, compatibility }) => ({
        id: String(job.id ?? job.url),
        title: plainText(job.jobTitle),
        company: plainText(job.companyName),
        location: plainText(job.jobGeo) || "Remote",
        type: (job.jobType ?? []).map((item) => plainText(item)).filter(Boolean),
        level: plainText(job.jobLevel),
        excerpt: plainText(job.jobExcerpt).slice(0, 260),
        description: plainText(job.jobDescription || job.jobExcerpt).slice(0, 18_000),
        publishedAt: job.pubDate ?? "",
        url: validJobUrl(job.url),
        matches,
        matchedSkills,
        compatibility,
        salary: job.salaryMin || job.salaryMax ? {
          min: job.salaryMin ?? null,
          max: job.salaryMax ?? null,
          currency: job.salaryCurrency ?? "",
          period: job.salaryPeriod ?? "",
        } : null,
      }));

    return json({ jobs: relatedJobs, source: { name: "Jobicy", url: "https://jobicy.com/" } });
  } catch {
    return json({ error: "No pudimos consultar las vacantes en este momento.", code: "upstream_unavailable" }, 502);
  }
}
