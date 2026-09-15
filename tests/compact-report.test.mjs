import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { analyzeResume } from "../app/analizar-cv/analysis.mjs";
import { improvementActions, reorganizeResume } from "../app/analizar-cv/resume-improvements.mjs";

register("./report-test-loader.mjs", import.meta.url);
const { default: AtsReport } = await import("../app/analizar-cv/ats-report.tsx");

const resume = `Camila Torres
camila@example.com · +51 987 654 321
HABILIDADES
React, TypeScript, SEO
EDUCACIÓN
Universidad de Lima, 2016 — 2020
EXPERIENCIA PROFESIONAL
Desarrolladora frontend · 2020 — Actualidad
• Mejoré la velocidad de carga en 18%.
PERFIL PROFESIONAL
Desarrolladora de interfaces accesibles.
IDIOMAS
Inglés intermedio`;
const vacancy = "Puesto: Desarrollador frontend\nUbicación: Lima, Perú\nRequisitos: React, TypeScript, Docker.";

test("reorganizes all original content without inventing requirements or changing facts", () => {
  const organized = reorganizeResume(resume);
  assert.deepEqual(organized.text.split(/\n+/).sort(), resume.split(/\n+/).sort());
  assert.deepEqual(organized.sections.map((section) => section.kind), ["profile", "experience", "education", "skills", "languages"]);
  assert.match(organized.text, /18%/);
  assert.match(organized.text, /2016 — 2020/);
  assert.doesNotMatch(organized.text, /Docker/);
  assert.equal(reorganizeResume(organized.text).text, organized.text);
});

test("preserves unlabeled text and repeated sections rather than discarding content", () => {
  const source = "Nombre Apellido\nUna experiencia sin encabezado\nEDUCACIÓN\nUniversidad A\nEDUCACIÓN\nCurso B";
  assert.deepEqual(reorganizeResume(source).text.split(/\n+/).sort(), source.split(/\n+/).sort());
  assert.equal(reorganizeResume("Una sola línea con SQL y 10 años.").text, "Una sola línea con SQL y 10 años.");
});

test("keeps the checklist short and never tells the user to invent a missing skill", () => {
  const result = analyzeResume(resume, vacancy, "es");
  const original = JSON.stringify(result);
  const actions = improvementActions(result, "es");
  assert.ok(actions.length > 0 && actions.length <= 3);
  assert.ok(actions.every((action) => action.evidence));
  assert.equal(actions[0].id, "vacancy-evidence");
  assert.match(actions[0].description, /Docker/);
  assert.match(actions[0].description, /si no, no la añadas/);
  assert.equal(JSON.stringify(result), original);
});

test("shows score and actions first, with compact technical details and no job form", () => {
  const result = analyzeResume(resume, vacancy, "es");
  const html = renderToStaticMarkup(createElement(AtsReport, { result, resumeText: resume, fileName: "camila-cv.pdf", targetLabel: "Desarrollador frontend", language: "es", onReset() {}, onEdit() {} }));
  assert.match(html, /Coincidencia de palabras clave/);
  assert.match(html, /camila-cv\.pdf/);
  assert.match(html, /Desarrollador frontend/);
  assert.match(html, /Qué cambiar o agregar/);
  assert.match(html, /Volver a analizar/);
  assert.match(html, /Guardar CV reorganizado en PDF/);
  assert.match(html, /Copiar CV/);
  assert.match(html, /Palabras clave de la vacante/);
  assert.match(html, /class="matched" aria-label="React: Encontradas"/);
  assert.match(html, /class="missing" aria-label="Docker: No encontradas"/);
  assert.match(html, /0–49 Baja/);
  assert.match(html, /50–79 Parcial/);
  assert.match(html, /80–100 Alta/);
  assert.doesNotMatch(html, /Ver vacantes similares|Abrir creador de CV/);
  const completeGroups = result.auditGroups.filter((group) => group.issueCount === 0);
  assert.equal((html.match(/<details\b/g) ?? []).length, 1 + completeGroups.length);
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:=|\s|>)/);
  const technical = html.indexOf('<details class="ats-technical-details"');
  assert.ok(html.indexOf("Qué cambiar o agregar") < technical);
  assert.ok(html.indexOf("Palabras clave de la vacante") < technical);
  assert.ok(html.indexOf("Volver a analizar") < technical);
  for (const group of result.auditGroups) assert.ok(html.indexOf(`<h2>${group.label}</h2>`) > technical);
  for (const group of completeGroups) assert.match(html, new RegExp(`${group.checks.length} de ${group.checks.length} correctas`));
  assert.ok(html.indexOf("ats-audit-checks") < html.indexOf("ats-passed-checks"));
  assert.match(html, /class="ats-passed-check"/);
  assert.doesNotMatch(html, /0 por revisar/);
  assert.match(html, /Reorganizamos las secciones con tu texto original\. No añadimos experiencia\./);
  assert.doesNotMatch(html, /<form|Puesto que buscas|Habilidades para la búsqueda|ats-report-sidebar/);
  assert.doesNotMatch(html, /similar-remote-title/);
});

test("does not render an invented percentage when requirements cannot be identified", () => {
  const result = analyzeResume(resume, "Una oportunidad para ti.", "en");
  const html = renderToStaticMarkup(createElement(AtsReport, { result, resumeText: resume, fileName: "camila-cv.pdf", targetLabel: "Frontend developer", language: "en", onReset() {}, onEdit() {} }));
  assert.match(html, /No measurable score/);
  assert.match(html, /<div class="ats-match-number"><strong>—<\/strong><\/div>/);
  assert.match(html, /What to change or add/);
});

test("job-title guidance does not invent a job score or employer requirements", () => {
  const role = "Desarrolladora React";
  const result = analyzeResume(resume, role, "es", "role");
  assert.equal(result.score, null);
  assert.equal(result.keywordMatch, null);
  assert.equal(result.metrics.checkCount, 21);
  const actions = improvementActions(result, "es");
  assert.equal(actions[0].id, "role-focus");
  assert.match(actions[0].title, /Desarrolladora React/);
  assert.doesNotMatch(actions.map((a) => a.title).join(" "), /Completa la descripción de la vacante/);
  const html = renderToStaticMarkup(createElement(AtsReport, { result, resumeText: resume, fileName: "camila-cv.pdf", targetLabel: role, language: "es", onReset() {}, onEdit() {} }));
  assert.match(html, /Tu puesto objetivo/);
  assert.match(html, /Desarrolladora React/);
  assert.doesNotMatch(html, /ats-visible-keywords|ats-score-guide/);
  assert.doesNotMatch(html, /ats-match-number|Coincidencia de palabras clave|Sin puntaje calculable/);
});

test("switching the same target from role to vacancy restores keyword matching", () => {
  const target = "React, TypeScript, Docker";
  assert.equal(analyzeResume(resume, target, "en", "role").keywordMatch, null);
  const vacancyResult = analyzeResume(resume, target, "en", "vacancy");
  assert.equal(vacancyResult.score, 67);
  assert.deepEqual(vacancyResult.keywordMatch.missing, ["Docker"]);
});
