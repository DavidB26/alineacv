"use client";

import { useEffect, useMemo, useState } from "react";
import type { AiLanguage } from "./ai-result";

type RelatedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string[];
  level: string;
  excerpt: string;
  description?: string;
  publishedAt: string;
  url: string;
  matches: string[];
  matchedSkills?: string[];
  compatibility?: number;
  salary: null | {
    min: number | null;
    max: number | null;
    currency: string;
    period: string;
  };
};

type JobsResponse = {
  jobs?: RelatedJob[];
};

const jobsCopy = {
  es: {
    eyebrow: "Siguiente paso",
    title: "Trabajos relacionados con tu perfil",
    body: "Buscamos vacantes remotas que coincidan con el cargo sugerido y tus habilidades técnicas.",
    privacy: "Tu CV y tus datos de contacto no se comparten con el portal de empleo.",
    loading: "Buscando oportunidades compatibles…",
    empty: "No encontramos una coincidencia remota suficientemente clara ahora mismo. Puedes ampliar la búsqueda en estos portales.",
    error: "Las vacantes no están disponibles en este momento, pero puedes continuar la búsqueda con los accesos directos.",
    match: "Coincide con",
    compatibility: "Compatibilidad estimada",
    estimate: "Calculada según cargo, habilidades, palabras clave y ubicación. No garantiza avanzar en el proceso.",
    published: "Publicada",
    view: "Ver vacante",
    adapt: "Adaptar mi CV",
    more: "Ampliar búsqueda",
    source: "Vacantes remotas provistas por Jobicy.",
    period: { yearly: "al año", monthly: "al mes", hourly: "por hora" },
  },
  en: {
    eyebrow: "Next step",
    title: "Jobs related to your profile",
    body: "We look for remote openings that match the suggested role and your technical skills.",
    privacy: "Your resume and contact details are never shared with the job provider.",
    loading: "Finding compatible opportunities…",
    empty: "We could not find a clear remote match right now. You can broaden your search on these job sites.",
    error: "Job listings are currently unavailable, but you can continue with the direct search links.",
    match: "Matches",
    compatibility: "Estimated compatibility",
    estimate: "Calculated from role, skills, keywords and location. It does not guarantee selection.",
    published: "Published",
    view: "View job",
    adapt: "Tailor my resume",
    more: "Broaden search",
    source: "Remote jobs provided by Jobicy.",
    period: { yearly: "per year", monthly: "per month", hourly: "per hour" },
  },
} as const;

function formatDate(value: string, language: AiLanguage) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "es" ? "es-PE" : "en-US", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatSalary(job: RelatedJob, language: AiLanguage) {
  if (!job.salary?.currency) return "";
  const values = [job.salary.min, job.salary.max].filter((value): value is number => typeof value === "number");
  if (!values.length) return "";
  try {
    const formatter = new Intl.NumberFormat(language === "es" ? "es-PE" : "en-US", {
      style: "currency",
      currency: job.salary.currency,
      maximumFractionDigits: 0,
    });
    const amount = values.length === 2 && values[0] !== values[1]
      ? `${formatter.format(values[0])} – ${formatter.format(values[1])}`
      : formatter.format(values[0]);
    const period = jobsCopy[language].period[job.salary.period as keyof typeof jobsCopy.es.period] ?? "";
    return `${amount}${period ? ` ${period}` : ""}`;
  } catch {
    return "";
  }
}

function searchLinks(role: string, location: string) {
  const keywords = role.trim();
  const place = location.trim();
  const query = [keywords, place].filter(Boolean).join(" ");
  const normalizedLocation = place.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const country = normalizedLocation.includes("colombia") ? "co"
    : normalizedLocation.includes("chile") ? "cl"
      : normalizedLocation.includes("mexico") ? "mx"
        : normalizedLocation.includes("argentina") ? "ar"
          : normalizedLocation.includes("ecuador") ? "ec"
            : normalizedLocation.includes("uruguay") ? "uy"
              : "pe";
  const roleSlug = keywords
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const bumeranOrigins: Record<string, string> = {
    ar: "https://www.bumeran.com.ar/empleos.html",
    cl: "https://www.laborum.cl/empleos.html",
    ec: "https://www.multitrabajos.com/empleos.html",
    mx: "https://www.bumeran.com.mx/empleos.html",
    pe: "https://www.bumeran.com.pe/empleos.html",
  };
  return [
    { name: "LinkedIn", url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(place)}` },
    { name: "Computrabajo", url: `https://${country}.computrabajo.com/trabajo-de-${roleSlug || "empleos"}` },
    { name: "Bumeran", url: bumeranOrigins[country] ?? "https://www.bumeran.com.pe/empleos.html" },
    { name: "Google Jobs", url: `https://www.google.com/search?q=${encodeURIComponent(`${query} jobs`)}` },
  ];
}

export default function RelatedJobs({
  role,
  industry,
  skills,
  location,
  language,
  onAdapt,
}: {
  role: string;
  industry: string;
  skills: string;
  location: string;
  language: AiLanguage;
  onAdapt: (description: string, title: string) => void;
}) {
  const [jobs, setJobs] = useState<RelatedJob[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const copy = jobsCopy[language];
  const links = useMemo(() => searchLinks(role, location), [role, location]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ role, skills, location });
    if (industry) params.set("industry", industry);

    fetch(`/api/jobs?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as JobsResponse;
        if (!response.ok) throw new Error("jobs_unavailable");
        setJobs(Array.isArray(payload.jobs) ? payload.jobs : []);
        setStatus("success");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setJobs([]);
        setStatus("error");
      });

    return () => controller.abort();
  }, [role, industry, skills, location]);

  return (
    <section className="related-jobs" aria-labelledby="related-jobs-title">
      <header>
        <div>
          <p>{copy.eyebrow}</p>
          <h4 id="related-jobs-title">{copy.title}</h4>
          <span>{copy.body}</span>
        </div>
        <small><b aria-hidden="true">✓</b>{copy.privacy}</small>
      </header>

      {status === "loading" && <div className="related-jobs-status" aria-live="polite"><i aria-hidden="true" />{copy.loading}</div>}

      {status === "success" && jobs.length > 0 && (
        <div className="related-jobs-grid">
          {jobs.map((job) => {
            const salary = formatSalary(job, language);
            const published = formatDate(job.publishedAt, language);
            const displayedMatches = job.matchedSkills?.length ? job.matchedSkills : job.matches;
            const compatibility = Number.isFinite(job.compatibility) ? Math.max(0, Math.min(100, job.compatibility ?? 0)) : null;
            const vacancy = [
              `${language === "es" ? "Puesto" : "Role"}: ${job.title}`,
              `${language === "es" ? "Empresa" : "Company"}: ${job.company}`,
              `${language === "es" ? "Ubicación" : "Location"}: ${job.location}`,
              job.description || job.excerpt,
            ].filter(Boolean).join("\n\n");
            return (
              <article key={job.id}>
                <div className="related-job-meta">
                  <span>{job.location}</span>
                  {job.type[0] && <span>{job.type[0]}</span>}
                  {job.level && <span>{job.level}</span>}
                </div>
                <h5>{job.title}</h5>
                <strong>{job.company}</strong>
                {compatibility !== null && <div className="related-job-compatibility">
                    <div><span>{copy.compatibility}</span><strong>{compatibility}%</strong></div>
                    <div role="progressbar" aria-label={`${copy.compatibility}: ${compatibility}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={compatibility}>
                      <i style={{ width: `${compatibility}%` }} />
                    </div>
                  </div>}
                {job.excerpt && <p>{job.excerpt}</p>}
                {displayedMatches.length > 0 && <div className="related-job-matches"><b>{copy.match}:</b>{displayedMatches.map((match) => <span key={match}>{match}</span>)}</div>}
                <footer>
                  <div className="related-job-details">{salary && <strong>{salary}</strong>}{published && <small>{copy.published} {published}</small>}</div>
                  <div className="related-job-actions">
                    <button type="button" onClick={() => onAdapt(vacancy, job.title)}>{copy.adapt}</button>
                    <a href={job.url} target="_blank" rel="noopener noreferrer">{copy.view} <span aria-hidden="true">↗</span></a>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {status !== "loading" && jobs.length === 0 && <div className={`related-jobs-status ${status === "error" ? "error" : ""}`}>{status === "error" ? copy.error : copy.empty}</div>}

      <div className="related-job-searches">
        <span>{copy.more}</span>
        <div>{links.map((link) => <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer">{link.name} ↗</a>)}</div>
      </div>
      <p className="related-jobs-estimate">{copy.estimate}</p>
      <a className="related-jobs-source" href="https://jobicy.com/" target="_blank" rel="noopener noreferrer">{copy.source}</a>
    </section>
  );
}
