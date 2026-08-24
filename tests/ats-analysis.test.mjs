import assert from "node:assert/strict";
import test from "node:test";
import { analyzeResume } from "../app/analizar-cv/analysis.mjs";

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
  assert.ok(weak.score < strong.score);
  assert.equal(strong.keywordMatch?.score, 100);
  assert.ok(strong.strengths.length >= 4);
  assert.ok(weak.issues.some((item) => item.id === "email" && item.severity === "critical"));
  assert.ok(weak.issues.some((item) => item.id === "skills"));
});

test("returns bilingual recommendations without inventing a job match", () => {
  const result = analyzeResume("Jordan Miller. Professional experience in design and content.", "", "en");

  assert.equal(result.keywordMatch, null);
  assert.equal(result.verdict, "High priority");
  assert.ok(result.issues.some((item) => item.title === "No detectable email"));
});
