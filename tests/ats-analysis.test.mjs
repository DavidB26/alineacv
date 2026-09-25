import assert from "node:assert/strict";
import test from "node:test";
import { analyzeResume, applyResumeBulletEdits, resumeSearchSkills, validateResumeBullet } from "../app/analizar-cv/analysis.mjs";

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
  assert.deepEqual(result.keywordMatch?.missing, ["API REST"]);
  assert.equal(result.keywordMatch?.score, 75);
  assert.doesNotMatch(JSON.stringify(result.keywordMatch), /consumiendo|dominas|tienes|lugar/i);
});

test("understands alternatives, compound skills and eligibility requirements in a full vacancy", () => {
  const resume = `David Beslanga
51 999 999 999 | david@example.com | Lima, Perú
8 años de experiencia en desarrollo frontend.
EXPERIENCIA PROFESIONAL
• Implementar componentes responsive y reutilizables con React y TypeScript.
HABILIDADES
Frontend: HTML5, CSS3, TypeScript, React y Responsive Design. | Herramientas: Git y GitHub.
FORMACIÓN ACADÉMICA
Bachiller en Ingeniería de Sistemas
IDIOMAS
Inglés: intermedio`;
  const vacancy = `Estudios técnicos y/o universitarios completos en Ingeniería de Sistemas o afines.
Inglés C1 avanzado. Residencia en cualquier provincia del Perú. +6 años de experiencia en desarrollo Front-End.
Experiencia sólida con React o Angular. Dominio de TypeScript, HTML5, CSS3 y Responsive Design.
Experiencia desarrollando dashboards orientados a datos e integrando aplicaciones con APIs REST.
Conceptos BI: KPIs, filtros, drill-down y datos gobernados.
Componentes reutilizables y arquitecturas frontend escalables. Git, testing y code review.
Herramientas de desarrollo asistidas por IA como GitHub Copilot, ChatGPT o Claude.`;
  const result = analyzeResume(resume, vacancy, "es");

  assert.ok(result.keywordMatch.matched.includes("React o Angular"));
  assert.ok(result.keywordMatch.matched.includes("Arquitectura frontend escalable"));
  assert.ok(result.keywordMatch.missing.includes("API REST"));
  assert.ok(result.keywordMatch.missing.includes("Dashboards y KPIs"));
  assert.ok(result.keywordMatch.missing.includes("Desarrollo asistido por IA"));
  assert.ok(!result.keywordMatch.missing.includes("Angular"));
  assert.ok(!result.keywordMatch.missing.includes("C1"));
  assert.ok(!result.keywordMatch.missing.includes("IA"));
  assert.ok(!result.keywordMatch.projectMissing.includes("Inglés C1"));
  assert.deepEqual(result.keywordMatch.nonProjectMissing, ["Inglés C1"]);
  assert.equal(result.eligibilityChecks.find((item) => item.id === "eligibility-english").status, "missing");
  assert.equal(result.eligibilityChecks.find((item) => item.id === "eligibility-experience").status, "matched");
  assert.equal(result.eligibilityChecks.find((item) => item.id === "eligibility-education").status, "matched");
  assert.equal(result.eligibilityChecks.find((item) => item.id === "eligibility-location").status, "matched");
});

test("collapses overlapping UX and research requirements before calculating the score", () => {
  const resume = "Diseñadora gráfica con experiencia en Figma y branding.";
  const vacancy = "Requisitos: UI/UX, UX, UI, investigación de usuarios, investigación, comunicación, Figma y branding.";
  const result = analyzeResume(resume, vacancy, "es");

  assert.deepEqual(result.keywordMatch.matched, ["Figma", "Branding"]);
  assert.deepEqual(result.keywordMatch.missing, ["UI/UX", "Investigación de usuarios", "Comunicación"]);
  assert.equal(result.keywordMatch.score, 40);
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

test("uses the same bullet rules for initial analysis and live revalidation", () => {
  const original = "Desarrollé componentes reutilizables para el equipo de frontend.";
  const edited = "Desarrollé componentes reutilizables con Docker y reduje el tiempo de entrega en 30%.";
  const before = validateResumeBullet(original, { keywords: ["Docker"] });
  const after = validateResumeBullet(edited, { keywords: ["Docker"] });

  assert.equal(before.hasActionVerb, true);
  assert.equal(before.hasMetric, false);
  assert.equal(before.hasQuantifiedAction, false);
  assert.deepEqual(before.matchedKeywords, []);
  assert.equal(after.hasActionVerb, true);
  assert.equal(after.hasMetric, true);
  assert.equal(after.hasQuantifiedAction, true);
  assert.deepEqual(after.matchedKeywords, ["Docker"]);
});

test("recognizes written Spanish numbers and common measurable-result phrases", () => {
  const cases = [
    "Reduje el tiempo de carga de siete a tres segundos.",
    "Aumenté la capacidad al doble.",
    "Reduje los costos a la mitad.",
    "Atendí cien usuarios durante el lanzamiento.",
    "Mejoré la conversión en 12%.",
  ];

  for (const bullet of cases) {
    const validation = validateResumeBullet(bullet);
    assert.equal(validation.hasMetric, true, bullet);
    assert.ok(validation.metricCount >= 1, bullet);
  }
  assert.equal(validateResumeBullet(cases[0]).hasQuantifiedAction, true);
  assert.equal(validateResumeBullet("Participé en reuniones del equipo.").hasMetric, false);
});

test("an empty edited bullet fails every relevant live rule", () => {
  const validation = validateResumeBullet("", { keywords: ["Docker"] });
  assert.equal(validation.hasMetric, false);
  assert.equal(validation.hasActionVerb, false);
  assert.equal(validation.hasQuantifiedAction, false);
  assert.deepEqual(validation.matchedKeywords, []);
});

test("updates keyword score and Impact incrementally from one edited bullet", () => {
  const vacancy = "Requisitos: React, TypeScript y Docker.";
  const result = analyzeResume(strongResume, vacancy, "es");
  const originalText = "• Coordiné proyectos de SEO, Google Analytics y HubSpot con equipos comerciales.";
  const currentText = "• Coordiné proyectos con Docker y reduje el tiempo de entrega en 30% para 300 usuarios.";
  const live = applyResumeBulletEdits(result, [{ originalText, currentText }], "es");
  const initialImpact = result.auditGroups.find((group) => group.id === "impact").score;
  const liveImpact = live.auditGroups.find((group) => group.id === "impact").score;

  assert.ok(live.score > result.score);
  assert.ok(live.keywordMatch.matched.includes("Docker"));
  assert.ok(!live.keywordMatch.missing.includes("Docker"));
  assert.ok(liveImpact >= initialImpact);
  assert.ok(live.atsQualityScore >= result.atsQualityScore);
});

test("incremental scoring uses written-number evidence from the shared engine", () => {
  const result = analyzeResume(strongResume, "Requisitos: React y TypeScript.", "es");
  const originalText = "• Coordiné proyectos de SEO, Google Analytics y HubSpot con equipos comerciales.";
  const currentText = "• Reduje el tiempo de carga de siete a tres segundos.";
  const live = applyResumeBulletEdits(result, [{ originalText, currentText }], "es");

  assert.ok(live.metrics.metricCount > result.metrics.metricCount);
  assert.match(
    live.auditGroups.find((group) => group.id === "impact").checks.find((check) => check.id === "quantified-actions").evidence,
    /líneas combinan una acción con una cifra/,
  );
});
