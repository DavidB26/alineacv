import assert from "node:assert/strict";
import test from "node:test";
import { analyzeResume, resumeSearchSkills } from "../app/analizar-cv/analysis.mjs";

const achievements = Array.from({ length: 18 }, (_, index) =>
  `• Implementé la campaña ${index + 1} y aumenté los leads en ${20 + index}% para más de ${100 + index} clientes.`,
).join("\n");

const strongResume = `
Camila Torres
camila.torres@email.com · +51 987 654 321 · linkedin.com/in/camilatorres
PERFIL PROFESIONAL
Especialista en marketing digital con cinco años de experiencia en adquisición, contenidos y analítica.
EXPERIENCIA PROFESIONAL
Growth Marketing Specialist · Mar 2022 — Actualidad
${achievements}
Analista de Marketing · 2019 — 2022
• Coordiné proyectos de SEO, Google Analytics y HubSpot con equipos comerciales.
EDUCACIÓN
Universidad de Lima · Licenciatura en Marketing · 2014 — 2019
HABILIDADES
SEO, Google Analytics, HubSpot, campañas, contenidos, Excel y gestión de proyectos.
`;

test("scores a structured, measurable resume above an incomplete one", () => {
  const strong = analyzeResume(strongResume, "Buscamos especialista en marketing con SEO, HubSpot, Google Analytics y campañas", "es");
  const weak = analyzeResume("Camila Torres. Busco trabajo en marketing. Tengo experiencia y muchas ganas de aprender.", "", "es");

  assert.ok(strong.score >= 80, `expected a strong score, received ${strong.score}`);
  assert.equal(weak.score, null);
  assert.ok(weak.atsQualityScore < strong.atsQualityScore);
  assert.equal(strong.keywordMatch?.score, 100);
  assert.equal(strong.metrics.checkCount, 21);
  assert.equal(strong.auditGroups.length, 5);
  assert.equal(strong.auditGroups.flatMap((group) => group.checks).length, 21);
  assert.ok(strong.auditGroups.every((group) => group.checks.every((check) => check.evidence && check.recommendation)));
  assert.ok(strong.strengths.length >= 4);
  assert.ok(weak.issues.some((item) => item.id === "email" && item.severity === "critical"));
  assert.ok(weak.issues.some((item) => item.id === "skills"));
  assert.ok(weak.auditGroups.flatMap((group) => group.checks).some((check) => check.status === "fail"));
});

test("returns bilingual recommendations without inventing a job match", () => {
  const result = analyzeResume("Jordan Miller. Professional experience in design and content.", "", "en");

  assert.equal(result.keywordMatch, null);
  assert.equal(result.score, null);
  assert.equal(result.verdict, "No measurable keyword match");
  assert.ok(result.issues.some((item) => item.title === "No detectable email"));
});

test("compares concrete job requirements instead of advertisement filler words", () => {
  const resume = "HABILIDADES JavaScript, React y HTML. EXPERIENCIA PROFESIONAL Desarrollador frontend.";
  const vacancy = "Si dominas JavaScript, React y HTML, tienes experiencia consumiendo APIs REST, este puede ser tu lugar.";
  const result = analyzeResume(resume, vacancy, "es");

  assert.deepEqual(result.keywordMatch?.matched, ["JavaScript", "React", "HTML"]);
  assert.deepEqual(result.keywordMatch?.missing, ["API", "REST"]);
  assert.equal(result.keywordMatch?.score, 60);
  assert.doesNotMatch(JSON.stringify(result.keywordMatch), /consumiendo|dominas|tienes|lugar/i);
});


test("never substitutes document quality for a missing or unrecognized job match", () => {
  for (const vacancy of ["", "   ", "Se busca una persona para atender el mostrador por las tardes."]) {
    const result = analyzeResume(strongResume, vacancy, "es");
    assert.equal(result.score, null);
    assert.equal(result.keywordMatch, null);
    assert.ok(result.atsQualityScore >= 80);
    assert.equal(result.metrics.checkCount, 21);
  }
});

test("a polished CV with no matching job keywords receives zero match", () => {
  const result = analyzeResume(strongResume, "Buscamos especialista en Python, Docker y Kubernetes.", "es");
  assert.equal(result.score, 0);
  assert.deepEqual(result.keywordMatch.matched, []);
  assert.deepEqual(result.keywordMatch.missing, ["Python", "Docker", "Kubernetes"]);
  assert.ok(result.atsQualityScore >= 80);
});

test("format and contact details cannot inflate the match against a vacancy", () => {
  const vacancy = "Se requiere SEO, HubSpot y Python.";
  const detailed = analyzeResume(strongResume, vacancy, "es");
  const brief = analyzeResume("SEO y HubSpot", vacancy, "es");
  assert.equal(detailed.score, 67);
  assert.equal(brief.score, detailed.score);
  assert.ok(detailed.atsQualityScore > brief.atsQualityScore);
});


test("job-search skill extraction excludes names, contact details and heading acronyms", () => {
  const skills = resumeSearchSkills("CAMILA TORRES camila@example.com +51 987 654 321 PERFIL PROFESIONAL HABILIDADES React y TypeScript");
  assert.equal(skills, "TypeScript, React");
  assert.doesNotMatch(skills, /Camila|Torres|email|987|PERFIL|HABILIDADES/i);
});
