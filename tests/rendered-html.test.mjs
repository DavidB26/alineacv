import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/", requestInit = {}, extraEnv = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html", ...(requestInit.headers ?? {}) },
      ...requestInit,
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      IMAGES: { input() { throw new Error("Image transforms are not used in this test."); } },
      ...extraEnv,
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function createRateLimitDatabase() {
  const counts = new Map();
  return {
    prepare(query) {
      const statement = {
        values: [],
        bind(...values) {
          this.values = values;
          return this;
        },
        async first() {
          if (!query.includes("INSERT INTO ai_rate_limits")) return null;
          const key = this.values[0];
          const count = (counts.get(key) ?? 0) + 1;
          counts.set(key, count);
          return { request_count: count };
        },
        async run() {
          return { success: true };
        },
      };
      return statement;
    },
    async batch() {
      return [];
    },
  };
}

test("server-renders the AlineaCV editor and SEO metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Creador de CV Harvard y ATS gratis \| AlineaCV<\/title>/i);
  assert.match(html, /name="description" content="Crea tu CV Harvard gratis/i);
  assert.match(html, /rel="canonical" href="http:\/\/localhost(?::3000)?"/i);
  assert.match(html, /rel="icon"[^>]+href="\/favicon\.svg"/i);
  assert.match(html, /application\/ld\+json/i);
  assert.match(html, /WebApplication/);
  assert.match(html, /property="og:image" content="http:\/\/localhost(?::3000)?\/og\.png"/i);
  assert.match(html, /Tu experiencia, bien alineada\./);
  assert.match(html, /Harvard Classic/);
  assert.match(html, /Harvard Photo/);
  assert.match(html, /Harvard Split/);
  assert.match(html, /Exportar PDF/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});

test("keeps resume data private and supports the complete local workflow", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const headerNavigation = await readFile(new URL("../app/header-navigation.tsx", import.meta.url), "utf8");
  const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");

  assert.match(page, /alineacv-resume-v1/);
  assert.match(page, /window\.localStorage/);
  assert.match(page, /window\.print\(\)/);
  assert.doesNotMatch(page, /from "next\/link"|<Link/);
  assert.match(page, /<HeaderNavigation active="builder"/);
  assert.match(headerNavigation, /aria-expanded=\{open\}/);
  assert.match(headerNavigation, /mobile-menu-panel/);
  assert.match(headerNavigation, /href="\/analizar-cv"/);
  assert.doesNotMatch(headerNavigation, /from "next\/link"|<Link/);
  assert.match(page, /type="file"/);
  assert.match(page, /classic.*photo-center.*photo-side/s);
  assert.match(page, /const experienceFirst = validExperience\.length > 0/);
  assert.match(page, /experienceFirst[\s\S]*?\[experienceSection, educationSection\][\s\S]*?\[educationSection, experienceSection\]/);
  assert.match(page, /ResumeSection title=\{copy\.technicalSkills\} compact/);
  assert.match(page, /className="resume-bullets"/);
  assert.match(page, /es:\s*\{/);
  assert.match(page, /en:\s*\{/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/favicon.svg", import.meta.url));
});

test("publishes crawl and install metadata", async () => {
  const robotsResponse = await render("/robots.txt");
  assert.equal(robotsResponse.status, 200);
  assert.match(await robotsResponse.text(), /Sitemap: http:\/\/localhost(?::3000)?\/sitemap\.xml/i);

  const sitemapResponse = await render("/sitemap.xml");
  assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text();
  assert.match(sitemap, /<loc>http:\/\/localhost(?::3000)?<\/loc>/i);
  assert.match(sitemap, /<loc>http:\/\/localhost(?::3000)?\/analizar-cv<\/loc>/i);

  const manifestResponse = await render("/manifest.webmanifest");
  assert.equal(manifestResponse.status, 200);
  assert.match(await manifestResponse.text(), /"short_name"\s*:\s*"AlineaCV"/i);
});

test("server-renders the private ATS analyzer with route-specific metadata", async () => {
  const response = await render("/analizar-cv");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /<title>Analizador de CV ATS con IA \| AlineaCV<\/title>/i);
  assert.match(html, /Tu CV, revisado con evidencia\./i);
  assert.match(html, /PDF (?:y|o) DOCX/i);
  assert.match(html, /El archivo se lee localmente; la IA solo recibe texto con tu permiso\./i);
  assert.match(html, /rel="canonical" href="http:\/\/localhost(?::3000)?\/analizar-cv"/i);
  assert.doesNotMatch(html, /property="og:image"/i);

  const analyzerSource = await readFile(new URL("../app/analizar-cv/ats-analyzer.tsx", import.meta.url), "utf8");
  const aiSource = await readFile(new URL("../app/analizar-cv/ai-improver.tsx", import.meta.url), "utf8");
  const jobsSource = await readFile(new URL("../app/analizar-cv/related-jobs.tsx", import.meta.url), "utf8");
  const routeSource = await readFile(new URL("../app/api/improve-cv/route.ts", import.meta.url), "utf8");
  const jobsRouteSource = await readFile(new URL("../app/api/jobs/route.ts", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(analyzerSource, /file\.arrayBuffer\(\)/);
  assert.doesNotMatch(analyzerSource, /from "next\/link"|<Link/);
  assert.match(analyzerSource, /<HeaderNavigation active="analyzer"/);
  assert.match(analyzerSource, /pdfjs-dist/);
  assert.match(analyzerSource, /GlobalWorkerOptions\.workerSrc = "\/pdf\.worker\.min\.mjs"/);
  assert.doesNotMatch(analyzerSource, /pdf\.worker\.min\.mjs\?url/);
  assert.doesNotMatch(analyzerSource, /pdf\.worker\.min\.mjs\?worker/);
  assert.doesNotMatch(analyzerSource, /pdf\.worker\.min\.mjs\?raw/);
  assert.match(analyzerSource, /mammoth/);
  assert.doesNotMatch(analyzerSource, /fetch\(|XMLHttpRequest|FormData/);
  assert.match(aiSource, /fetch\("\/api\/improve-cv"/);
  assert.match(aiSource, /window\.localStorage\.setItem\("alineacv-resume-v1"/);
  assert.doesNotMatch(aiSource, /GROQ_API_KEY|FormData/);
  assert.match(aiSource, /protectPrivateText/);
  assert.match(aiSource, /Descargar CV ATS/);
  assert.match(aiSource, /createPortal/);
  assert.match(aiSource, /window\.print\(\)/);
  assert.match(aiSource, /responsibilityLines/);
  assert.match(aiSource, /<RelatedJobs/);
  assert.match(aiSource, /Generar CV adaptado/);
  assert.match(analyzerSource, /Vista rápida de requisitos/);
  assert.match(analyzerSource, /21 comprobaciones/);
  assert.match(analyzerSource, /ats-landing-dropzone/);
  assert.match(analyzerSource, /ats-report-layout/);
  assert.match(analyzerSource, /result\.auditGroups\.map/);
  assert.match(analyzerSource, /audit\.evidence/);
  assert.match(analyzerSource, /copy\.checkStatus/);
  assert.match(aiSource, /Compatibilidad semántica con la vacante/);
  assert.match(analyzerSource, /onAdapt=\{adaptToJob\}/);
  assert.match(jobsSource, /fetch\(`\/api\/jobs\?/);
  assert.match(jobsSource, /Adaptar mi CV/);
  assert.match(jobsSource, /role="progressbar"/);
  assert.match(jobsSource, /params\.set\("industry", industry\)/);
  assert.match(jobsSource, /LinkedIn/);
  assert.match(jobsSource, /Computrabajo/);
  assert.match(jobsSource, /Bumeran/);
  assert.match(jobsSource, /Vacantes remotas provistas por Jobicy/);
  assert.match(jobsRouteSource, /https:\/\/jobicy\.com\/api\/v2\/remote-jobs/);
  assert.match(jobsRouteSource, /cacheTtl:\s*3600/);
  assert.match(jobsRouteSource, /compatibility/);
  assert.doesNotMatch(jobsRouteSource, /GROQ_API_KEY|resumeText|fullName|email|phone/);
  assert.match(routeSource, /https:\/\/api\.groq\.com\/openai\/v1\/chat\/completions/);
  assert.match(routeSource, /redactSensitiveText/);
  assert.match(routeSource, /store:\s*false/);
  assert.match(routeSource, /type:\s*"json_schema"/);
  assert.match(routeSource, /Never invent employers/);
  assert.match(routeSource, /compatibility must work for any occupation/);
  assert.match(routeSource, /jobSearch\.query must be a concise English job title/);
  assert.match(routeSource, /infinitive action verb/);
  assert.match(routeSource, /Preserve every date exactly/);
  assert.match(routeSource, /Preserve every stated skill proficiency exactly/);
  assert.match(routeSource, /sourceDateRanges/);
  assert.match(routeSource, /mergeDeclaredSkillLevels/);
  assert.match(routeSource, /removeUnsupportedNumbers/);
  assert.match(routeSource, /allowedNumericFacts/);
  assert.match(styles, /\.ats-workspace[\s\S]*?font-family:\s*var\(--font-ui\)/);
  assert.match(styles, /\.ats-landing[\s\S]*?grid-template-columns/);
  assert.match(styles, /\.ats-report-layout[\s\S]*?grid-template-columns/);
  assert.match(styles, /\.ats-audit-checks article\.pass/);
  assert.match(styles, /@media \(max-width:\s*720px\)[\s\S]*?\.ats-report-layout\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(styles, /\.ats-ai-resume pre[\s\S]*?font-size:\s*13\.5px/);
  assert.match(styles, /body\.alineacv-ai-printing[\s\S]*?\.ats-ai-print-document/);
  assert.match(styles, /\.editor-panel[\s\S]*?overflow-y:\s*auto/);
  assert.match(styles, /--font-ui:\s*"Manrope"/);
  assert.match(styles, /\.mobile-navigation\s*\{[^}]*display:\s*none/);
  assert.match(styles, /@media \(max-width:\s*720px\)[\s\S]*?\.mobile-navigation\s*\{[^}]*display:\s*block/);
  assert.match(styles, /\.mobile-menu-panel[\s\S]*?position:\s*absolute/);
  assert.match(styles, /\.related-jobs-grid[\s\S]*?grid-template-columns:\s*repeat\(2/);
  assert.match(styles, /@media \(max-width:\s*720px\)[\s\S]*?\.related-jobs-grid\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(styles, /\.resume-sheet\s*\{[\s\S]*?height:\s*auto[\s\S]*?overflow:\s*hidden/);
  assert.match(styles, /\.resume-item ul\.resume-bullets[\s\S]*?list-style:\s*disc outside/);
  assert.doesNotMatch(styles, /\.resume-sheet\s*\{[\s\S]{0,180}?aspect-ratio/);
  await access(new URL("../public/pdf.worker.min.mjs", import.meta.url));
});

test("returns ranked related jobs without sending the resume to the provider", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    if (String(url).includes("get=industries")) {
      return Response.json({ industries: [{ industryName: "Software Engineering", industrySlug: "engineering" }] });
    }
    return Response.json({ jobs: [
      {
        id: 1,
        url: "https://jobicy.com/jobs/1-frontend-developer",
        jobTitle: "Frontend Developer",
        companyName: "Aster Labs",
        jobIndustry: ["Software Engineering"],
        jobType: ["Full-Time"],
        jobGeo: "Anywhere",
        jobLevel: "Midweight",
        jobExcerpt: "Build React and TypeScript interfaces for a distributed product team.",
        pubDate: "2026-08-24T10:00:00Z",
      },
      {
        id: 2,
        url: "https://jobicy.com/jobs/2-sales-manager",
        jobTitle: "Sales Manager",
        companyName: "North Co",
        jobIndustry: ["Sales"],
        jobType: ["Full-Time"],
        jobGeo: "USA",
        jobExcerpt: "Lead an enterprise sales team.",
        pubDate: "2026-08-24T11:00:00Z",
      },
    ] });
  };

  try {
    const response = await render("/api/jobs?role=Frontend%20Developer&industry=engineering&skills=React%2C%20TypeScript&location=Lima%2C%20Per%C3%BA");
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.jobs.length, 1);
    assert.equal(payload.jobs[0].title, "Frontend Developer");
    assert.deepEqual(payload.jobs[0].matches.slice(0, 2), ["frontend", "developer"]);
    assert.deepEqual(payload.jobs[0].matchedSkills, ["React", "TypeScript"]);
    assert.equal(payload.jobs[0].compatibility, 96);
    assert.match(payload.jobs[0].description, /React and TypeScript/);
    assert.deepEqual(requestedUrls, [
      "https://jobicy.com/api/v2/remote-jobs?get=industries",
      "https://jobicy.com/api/v2/remote-jobs?count=100&industry=engineering&tag=frontend",
    ]);
    assert.doesNotMatch(requestedUrls.join(" "), /Lima|React|TypeScript|resume|CV/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ranks creative profiles through the current Jobicy industry taxonomy", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("get=industries")) {
      return Response.json({ industries: [{ industryName: "Creative & Design", industrySlug: "design-multimedia" }] });
    }
    return Response.json({ jobs: [{
      id: 3,
      url: "https://jobicy.com/jobs/3-product-designer",
      jobTitle: "Product Designer",
      companyName: "Canvas Studio",
      jobIndustry: ["Creative & Design"],
      jobType: ["Full-Time"],
      jobGeo: "LATAM",
      jobLevel: "Midweight",
      jobDescription: "Create product experiences with Figma, prototyping and user research.",
      pubDate: "2026-08-24T12:00:00Z",
    }] });
  };

  try {
    const response = await render("/api/jobs?role=Product%20Designer&industry=design-multimedia&skills=Figma%2C%20User%20Research&location=Lima%2C%20Per%C3%BA");
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.jobs.length, 1);
    assert.equal(payload.jobs[0].title, "Product Designer");
    assert.deepEqual(payload.jobs[0].matchedSkills, ["Figma", "User Research"]);
    assert.equal(payload.jobs[0].compatibility, 96);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("protects the server-side AI improvement endpoint", async () => {
  const getResponse = await render("/api/improve-cv");
  assert.equal(getResponse.status, 405);

  const invalidResponse = await render("/api/improve-cv", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ resumeText: "too short", jobDescription: "", language: "es" }),
  });
  assert.equal(invalidResponse.status, 400);
  assert.equal((await invalidResponse.json()).code, "invalid_input");

  const validResume = "PERFIL PROFESIONAL Experiencia en marketing y analítica. EXPERIENCIA PROFESIONAL Coordiné campañas y proyectos. EDUCACIÓN Universidad. HABILIDADES SEO, Analytics y Excel. ".repeat(2);
  const missingKeyResponse = await render("/api/improve-cv", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ resumeText: validResume, jobDescription: "", language: "es" }),
  });
  assert.equal(missingKeyResponse.status, 503);
  assert.equal((await missingKeyResponse.json()).code, "not_configured");
});

test("returns a structured AI improvement without uploading the original file", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamBody;
  const mockResult = {
    headline: "Una base clara con logros por fortalecer",
    overallAssessment: "La estructura es reconocible y puede ganar impacto con logros específicos.",
    targetRole: "Especialista de Marketing",
    recommendations: [],
    keywords: { matched: ["marketing"], missing: [], advice: [] },
    compatibility: {
      score: 82,
      matchedRequirements: ["Marketing digital", "Analítica"],
      missingRequirements: ["Automatización"],
      transferableStrengths: ["Gestión de campañas"],
      explanation: "El CV respalda la mayoría de requisitos prioritarios.",
    },
    jobSearch: { query: "Digital Marketing Specialist", industry: "marketing" },
    improvedResume: "CAMILA TORRES\n\nPERFIL PROFESIONAL\nEspecialista de marketing.",
    factsToVerify: [],
    builderData: {
      personal: { fullName: "Camila Torres", role: "Especialista de Marketing", email: "camila@email.com", phone: "+51 999 999 999", location: "Lima, Perú", website: "", linkedin: "", summary: "Especialista de marketing." },
      education: [],
      experience: [{ company: "Nexo Digital", position: "Analista de Marketing", location: "Lima, Perú", startDate: "01/2019", endDate: "12/2025", responsibilities: "Analizar campañas de marketing." }],
      skills: { technical: "Marketing, React, SQL", languages: "", additional: "", certifications: [] },
      noExperience: false,
    },
  };

  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(init.headers.Authorization, "Bearer test-key");
    upstreamBody = JSON.parse(init.body);
    return Response.json({ choices: [{ message: { role: "assistant", content: JSON.stringify(mockResult) } }] });
  };

  try {
    const validResume = `Camila Torres
camila.torres@email.com · +51 987 654 321 · linkedin.com/in/camilatorres
PERFIL PROFESIONAL Experiencia en marketing y analítica.
EXPERIENCIA PROFESIONAL Coordiné campañas y aumenté los leads en 18%.
Analista de Marketing | Nexo Digital | Lima, Perú | 04/2020 — 09/2021.
EDUCACIÓN Universidad. HABILIDADES SEO, Analytics, React (Avanzado), SQL - Intermedio. `.repeat(2);
    const response = await render("/api/improve-cv", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resumeText: validResume, jobDescription: "Especialista de marketing", language: "es" }),
    }, { GROQ_API_KEY: "test-key", DB: createRateLimitDatabase() });

    assert.equal(response.status, 200);
    const responseBody = await response.json();
    assert.equal(responseBody.headline, mockResult.headline);
    assert.equal(responseBody.builderData.experience[0].startDate, "04/2020");
    assert.equal(responseBody.builderData.experience[0].endDate, "09/2021");
    assert.match(responseBody.builderData.skills.technical, /React \(Avanzado\)/);
    assert.match(responseBody.builderData.skills.technical, /SQL \(Intermedio\)/);
    assert.equal(upstreamBody.store, false);
    assert.equal(upstreamBody.model, "openai/gpt-oss-120b");
    assert.equal(upstreamBody.max_completion_tokens, 3_600);
    assert.equal(upstreamBody.response_format.type, "json_schema");
    assert.equal(upstreamBody.response_format.json_schema.strict, true);
    const aiSchema = upstreamBody.response_format.json_schema.schema;
    assert.ok(aiSchema.required.includes("compatibility"));
    assert.ok(aiSchema.required.includes("jobSearch"));
    assert.ok(aiSchema.properties.jobSearch.properties.industry.enum.includes("design-multimedia"));
    assert.ok(aiSchema.properties.jobSearch.properties.industry.enum.includes("accounting-finance"));
    assert.ok(aiSchema.properties.jobSearch.properties.industry.enum.includes("healthcare"));
    assert.equal(upstreamBody.messages[0].role, "system");
    const protectedInput = upstreamBody.messages[1].content;
    assert.doesNotMatch(protectedInput, /Camila Torres|camila\.torres@email\.com|987 654 321|camilatorres/);
    assert.match(protectedInput, /\[\[ALINEACV_(?:NAME|EMAIL|PHONE|URL)_\d+\]\]/);
    assert.match(protectedInput, /"allowedNumericFacts":\[[^\]]*"18%"/);
    assert.match(protectedInput, /"exactDateRanges":\[\{"start":"04\/2020","end":"09\/2021"\}/);
    assert.match(protectedInput, /"statedSkillLevels":\[[^\]]*"skill":"React","level":"Avanzado"/);
    assert.doesNotMatch(JSON.stringify(upstreamBody), /\.pdf|application\/pdf|FormData/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
