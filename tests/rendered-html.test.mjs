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

test("server-renders the ATS landing with both inputs and focused metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Analizador de CV ATS gratis \| AlineaCV<\/title>/i);
  assert.match(html, /Acerca tu CV al puesto que buscas/);
  assert.match(html, /Tengo una convocatoria/);
  assert.match(html, /Solo tengo el puesto/);
  assert.match(html, /type="file"/);
  assert.match(html, /<textarea/);
  assert.match(html, /Analizar mi CV/);
  assert.match(html, /Tres acciones prioritarias con evidencia, basadas en 21 comprobaciones/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /rel="canonical" href="http:\/\/localhost(?::3000)?"/);
  assert.match(html, /property="og:image"/);
  assert.doesNotMatch(html, /Harvard Classic|Crear CV|Ver vacantes similares|ats-report-preview|Más de 20 comprobaciones/);
});

test("keeps resume data private and supports the complete local workflow", async () => {
  const page = await readFile(new URL("../app/legacy-builder.tsx", import.meta.url), "utf8");
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
  assert.doesNotMatch(sitemap, /\/analizar-cv/);

  const manifestResponse = await render("/manifest.webmanifest");
  assert.equal(manifestResponse.status, 200);
  assert.match(await manifestResponse.text(), /"short_name"\s*:\s*"AlineaCV"/i);
});

test("redirects the previous analyzer address to the single landing", async () => {
  const response = await render("/analizar-cv");
  assert.equal(response.status, 308);
  assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, "/");
});

test("the removed improvement endpoint cannot contact an AI provider", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error("Unexpected external request"); };
  try {
    for (const method of ["GET", "POST"]) {
      const response = await render("/api/improve-cv", { method });
      assert.equal(response.status, 404);
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
