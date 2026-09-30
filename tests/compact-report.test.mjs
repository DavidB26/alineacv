import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { analyzeResume } from "../app/analizar-cv/analysis.mjs";
import { applyResumeLineEdits, editableImprovementTargets, improvementActions, reorganizeResume, repairWrappedResumeLines } from "../app/analizar-cv/resume-improvements.mjs";

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
• Colaboración con el equipo de frontend.
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

test("repairs visual PDF line wraps inside bullets without joining the next dated entry", () => {
  const extracted = `EXPERIENCIA PROFESIONAL
• Mejorar la experiencia y reducir fricción mediante
pruebas de usuario y análisis de conversión.
Desarrollador web · 05/2023 — Presente
• Construir un portal completo.`;
  const repaired = repairWrappedResumeLines(extracted);
  assert.match(repaired, /mediante pruebas de usuario y análisis de conversión\./);
  assert.match(repaired, /\nDesarrollador web · 05\/2023 — Presente\n/);
});

test("joins an uppercase acronym that continues a wrapped bullet", () => {
  const extracted = `EXPERIENCIA PROFESIONAL
• Desarrollar un portal en WordPress con estructura orientada a
SEO.
• Construir componentes reutilizables.`;
  const repaired = repairWrappedResumeLines(extracted);
  assert.match(repaired, /estructura orientada a SEO\./);
  assert.doesNotMatch(repaired, /\nSEO\./);
});

test("removes printed page labels without polluting the name or the last bullet", () => {
  const extracted = `David Beslanga Rabanal | CV profesional Página 1
David Beslanga Rabanal
EXPERIENCIA PROFESIONAL
(cid:127) Coordinar entregas en plazos acotados.
David Beslanga Rabanal | CV profesional Página 2
EXPERIENCIA PROFESIONAL - CONTINUACIÓN
(cid:127) Desarrollar sitios accesibles.`;
  const repaired = repairWrappedResumeLines(extracted);
  const organized = reorganizeResume(repaired);
  assert.equal(organized.header.filter((line) => line === "David Beslanga Rabanal").length, 1);
  assert.doesNotMatch(organized.text, /CV profesional Página/);
  assert.ok(organized.sections.every((section) => section.kind === "experience"));
  assert.match(organized.text, /\(cid:127\) Coordinar entregas en plazos acotados\./);
  assert.match(organized.text, /\(cid:127\) Desarrollar sitios accesibles\./);
});

test("selects the original problematic bullet and applies edits only to the working copy", () => {
  const result = analyzeResume(resume, vacancy, "es");
  const targets = editableImprovementTargets(result, resume, "es");
  assert.ok(targets.length > 0);
  assert.match(targets[0].originalText, /Colaboración con el equipo/);
  assert.ok(targets[0].rules.some((rule) => rule.type === "metric" || rule.type === "quantified-action"));
  assert.ok(targets.every((target) => target.rules.every((rule) => rule.type !== "keyword")));
  const edited = applyResumeLineEdits(resume, [{ ...targets[0], currentText: "Mejoré la velocidad en 30% usando Docker." }]);
  assert.match(edited, /Mejoré la velocidad en 30% usando Docker/);
  assert.match(resume, /Mejoré la velocidad de carga en 18%/);
});

test("preserves long pasted bullet text without truncating the working copy", () => {
  const longText = `Desarrollé ${"componentes reutilizables y documentación técnica ".repeat(24)}para el equipo.`;
  const edited = applyResumeLineEdits(resume, [{
    lineIndex: 8,
    prefix: "• ",
    originalText: "Mejoré la velocidad de carga en 18%.",
    currentText: longText,
  }]);

  assert.ok(longText.length > 1_000);
  assert.equal(edited.split(/\n/)[8], `• ${longText}`);
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

test("adapts the resume while separating supported and unverified skills", () => {
  const result = analyzeResume(resume, vacancy, "es");
  const html = renderToStaticMarkup(createElement(AtsReport, { result, resumeText: resume, fileName: "camila-cv.pdf", targetLabel: "Desarrollador frontend", versionName: "CV - Acme - Desarrollador frontend", language: "es", onReset() {}, onEdit() {} }));
  assert.match(html, /Coincidencia actual del CV/);
  assert.match(html, /camila-cv\.pdf/);
  assert.match(html, /Desarrollador frontend/);
  assert.match(html, /Tu CV adaptado está listo/);
  assert.doesNotMatch(html, /Volver a analizar/);
  assert.match(html, /Descargar CV adaptado en PDF/);
  assert.match(html, /Copiar CV adaptado/);
  assert.match(html, /Coincidencia respaldada/);
  assert.match(html, /Requisitos por acreditar/);
  assert.match(html, /Habilidades demostradas/);
  assert.match(html, /TypeScript · React/);
  assert.match(html, /Habilidades no acreditadas/);
  assert.match(html, /Docker/);
  assert.doesNotMatch(html, /Proyecto independiente|Proyecto completo recomendado|Qué debe incluir|Versión breve que irá al CV/);
  assert.doesNotMatch(html, /Usar este borrador|Confirmo que puedo respaldarlo e incluirlo|Versión guardada/);
  assert.doesNotMatch(html, /<textarea/);
  assert.match(html, /Palabras clave de la vacante/);
  assert.match(html, /class="matched" aria-label="React: Encontradas"/);
  assert.match(html, /class="missing" aria-label="Docker: No encontradas"/);
  assert.match(html, /<strong>67<\/strong><span>%<\/span>/);
  assert.match(html, /<span>Requisitos por acreditar<\/span><strong>1<\/strong>/);
  assert.match(html, /0–49 Baja/);
  assert.match(html, /50–79 Parcial/);
  assert.match(html, /80–100 Alta/);
  assert.match(html, /Calidad del documento/);
  assert.doesNotMatch(html, /Ver vacantes similares|Abrir creador de CV/);
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:=|\s|>)/);
  const technical = html.indexOf('<details class="ats-technical-details"');
  assert.ok(html.indexOf("Tu CV adaptado está listo") < technical);
  assert.ok(html.indexOf("Palabras clave de la vacante") < technical);
  for (const group of result.auditGroups) assert.ok(html.indexOf(`<h2>${group.label}</h2>`) > technical);
  assert.ok(html.indexOf("ats-audit-checks") < html.indexOf("ats-passed-checks"));
  assert.match(html, /class="ats-passed-check"/);
  assert.doesNotMatch(html, /0 por revisar/);
  assert.match(html, /La descarga conserva tus datos, empresas, cargos y experiencia original/);
  assert.doesNotMatch(html, /<form|Puesto que buscas|Habilidades para la búsqueda|ats-report-sidebar/);
  assert.doesNotMatch(html, /similar-remote-title/);
});

test("keeps personal eligibility requirements outside skill coverage", () => {
  const fullVacancy = `${vacancy}\nInglés C1 avanzado. +6 años de experiencia. Estudios universitarios completos. Residencia en Perú.`;
  const result = analyzeResume(resume, fullVacancy, "es");
  const html = renderToStaticMarkup(createElement(AtsReport, { result, resumeText: resume, fileName: "camila-cv.pdf", targetLabel: "Desarrollador frontend", versionName: "CV - Desarrollador frontend", language: "es", onReset() {}, onEdit() {} }));

  assert.match(html, /Requisitos personales por revisar/);
  assert.match(html, /Idiomas, estudios, residencia y años de experiencia se mantienen separados/);
  assert.match(html, /Inglés C1/);
  assert.match(html, /No acreditado/);
  assert.match(html, /El CV declara nivel INTERMEDIO/);
  const adaptedChanges = html.slice(html.indexOf("adapted-changes"), html.indexOf("offer-eligibility"));
  assert.doesNotMatch(adaptedChanges, /Inglés C1/);
});

test("does not render an invented percentage when requirements cannot be identified", () => {
  const result = analyzeResume(resume, "Una oportunidad para ti.", "en");
  const html = renderToStaticMarkup(createElement(AtsReport, { result, resumeText: resume, fileName: "camila-cv.pdf", targetLabel: "Frontend developer", versionName: "CV - Frontend developer", language: "en", onReset() {}, onEdit() {} }));
  assert.match(html, /No measurable score/);
  assert.match(html, /<div class="ats-match-number"><strong>—<\/strong><\/div>/);
  assert.match(html, /Your tailored resume is ready/);
  assert.match(html, /<span>Requirements to verify<\/span><strong>—<\/strong>/);
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
  const html = renderToStaticMarkup(createElement(AtsReport, { result, resumeText: resume, fileName: "camila-cv.pdf", targetLabel: role, versionName: "CV - Desarrolladora React", language: "es", onReset() {}, onEdit() {} }));
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
