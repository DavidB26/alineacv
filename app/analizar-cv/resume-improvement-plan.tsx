"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { analyzeResume } from "./analysis.mjs";
import { appendConfirmedEvidence, automaticProjectSuggestions, buildAdaptedResume } from "./adapted-resume.mjs";

type Language = "es" | "en";
type ResumeBlock =
  | { type: "entry"; title: string; date: string; meta: string[]; bullets: string[] }
  | { type: "row"; label: string; value: string }
  | { type: "paragraph"; text: string };
type AdaptedDocument = {
  name: string;
  headline: string;
  contactLines: string[];
  sections: Array<{ kind: string; heading: string; blocks: ResumeBlock[] }>;
  plainText: string;
};

export function ReferenceResumeDocument({ resume, language }: { resume: AdaptedDocument; language: Language }) {
  return <article className="ats-export-document reference-resume" lang={language}>
    <header className="reference-resume-header">
      <h1>{resume.name}</h1>
      <p>{resume.headline}</p>
      {resume.contactLines.length > 0 && <div>{resume.contactLines.map((line, index) => <span key={index}>{line}</span>)}</div>}
    </header>
    <main>
      {resume.sections.map((section) => <section className={"reference-section reference-section-" + section.kind} key={section.kind}>
        <h2>{section.heading}</h2>
        {section.blocks.map((block, index) => {
          if (block.type === "entry") return <article className="reference-entry" key={index}>
            {(block.title || block.date) && <header><strong>{block.title}</strong>{block.date && <time>{block.date}</time>}</header>}
            {block.meta.map((line, metaIndex) => <p className="reference-entry-meta" key={metaIndex}>{line}</p>)}
            {block.bullets.length > 0 && <ul>{block.bullets.map((line, bulletIndex) => <li key={bulletIndex}>{line}</li>)}</ul>}
          </article>;
          if (block.type === "row") return <p className="reference-row" key={index}><strong>{block.label}:</strong><span>{block.value}</span></p>;
          return <p key={index}>{block.text}</p>;
        })}
      </section>)}
    </main>
  </article>;
}

export default function ResumeImprovementPlan({ result, originalResumeText, fileName, targetLabel, versionName, language }: {
  result: ReturnType<typeof analyzeResume>;
  originalResumeText: string;
  fileName: string;
  targetLabel: string;
  versionName: string;
  language: Language;
}) {
  const es = language === "es";
  const projects = useMemo(() =>
    automaticProjectSuggestions(result, targetLabel, originalResumeText, language),
  [result, targetLabel, originalResumeText, language]);
  const completeResumeText = useMemo(() =>
    appendConfirmedEvidence(originalResumeText, projects, language),
  [originalResumeText, projects, language]);
  const adaptedResume = useMemo<AdaptedDocument>(() =>
    buildAdaptedResume(completeResumeText, result, targetLabel, language, { fileName }),
  [completeResumeText, result, targetLabel, language, fileName]);
  const [printing, setPrinting] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const eligibility = result.eligibilityChecks ?? [];

  useEffect(() => {
    if (!printing) return;
    const originalTitle = document.title;
    document.title = versionName;
    document.body.classList.add("alineacv-printing");
    const finish = () => setPrinting(false);
    window.addEventListener("afterprint", finish);
    const timer = window.setTimeout(() => window.print(), 150);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("alineacv-printing");
      document.title = originalTitle;
    };
  }, [printing, versionName]);

  async function copyResume() {
    try {
      await navigator.clipboard.writeText(adaptedResume.plainText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return <section className="resume-improvement-plan automatic-resume-plan" aria-labelledby="improvement-plan-title">
    <h2 id="improvement-plan-title">{es ? "Proyecto independiente para esta oferta" : "Independent project for this role"}</h2>
    <p className="automatic-resume-intro">{projects.length
      ? (es
        ? `Tu CV actual tiene ${result.score ?? "—"}% de coincidencia. Te proponemos un proyecto demostrable según los requisitos faltantes. En el CV solo aparecerá la versión breve; aquí tienes el alcance completo para desarrollarlo y enseñarlo.`
        : `Your current resume has a ${result.score ?? "—"}% match. We propose a demonstrable project based on the missing requirements. Only the concise version will appear in the resume; the full scope stays here so you can build and present it.`)
      : (es ? "No detectamos una brecha técnica que deba convertirse en proyecto. Revisa igualmente los requisitos personales de la oferta." : "We did not detect a technical gap that should become a project. Review the job's personal requirements as well.")}</p>

    {eligibility.length > 0 && <section className="offer-eligibility" aria-labelledby="offer-eligibility-title">
      <h3 id="offer-eligibility-title">{es ? "Requisitos que un proyecto no reemplaza" : "Requirements a project cannot replace"}</h3>
      <p>{es ? "Los separamos de las habilidades técnicas para no convertir idiomas, estudios, residencia o años de experiencia en proyectos ficticios." : "We keep these separate from technical skills so languages, education, residence or years of experience do not become fictional projects."}</p>
      <ul>{eligibility.map((item) => <li key={item.id}>
        <div><strong>{item.label}</strong><span>{item.evidence}</span></div>
        <span className={`offer-eligibility-status ${item.status}`}>
          {item.status === "matched" ? (es ? "Detectado" : "Found") : item.status === "missing" ? (es ? "No acreditado" : "Not shown") : (es ? "Confirmar" : "Confirm")}
        </span>
      </li>)}</ul>
    </section>}

    {projects.length > 0 && <section className="automatic-projects" aria-labelledby="automatic-projects-title">
      <h3 id="automatic-projects-title">{es ? "Proyecto completo recomendado" : "Recommended complete project"}</h3>
      <div>
        {projects.map((project, index) => <article className="automatic-project-card" key={project.id}>
          <span className="automatic-project-number">{es ? `${project.projectType} ${index + 1}` : `${project.projectType} ${index + 1}`}</span>
          <h4>{project.title}</h4>
          <p className="automatic-project-summary">{project.summary}</p>
          <div className="automatic-project-plan">
            <section>
              <h5>{es ? "Qué debe incluir" : "What it should include"}</h5>
              <ul>{project.scope.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <section>
              <h5>{es ? "Qué debes poder enseñar" : "What you should be able to show"}</h5>
              <ul>{project.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          </div>
          <strong className="automatic-project-keyword-label">{es ? "Requisitos que aborda" : "Requirements addressed"}</strong>
          <ul className="automatic-project-keywords" aria-label={es ? "Requisitos que aborda" : "Requirements addressed"}>
            {project.keywords.map((keyword) => <li key={keyword}>{keyword}</li>)}
          </ul>
          <section className="automatic-project-cv-preview" aria-label={es ? "Versión breve para el CV" : "Concise resume version"}>
            <span>{es ? "Versión breve que irá al CV" : "Concise version for the resume"}</span>
            <h5>{project.title} — {project.projectType}</h5>
            <ul className="automatic-project-steps">
              {(project.bullets ?? [project.text]).map((step) => <li key={step}>{step}</li>)}
            </ul>
          </section>
        </article>)}
      </div>
    </section>}

    <div className="resume-export-actions" aria-label={es ? "Descargar CV adaptado" : "Download adapted resume"}>
      <button className="primary" type="button" onClick={() => setPrinting(true)} disabled={printing}>{es ? "Descargar CV completo en PDF" : "Download complete resume as PDF"} <span aria-hidden="true">↓</span></button>
      <button type="button" onClick={() => void copyResume()}>{copyStatus === "copied" ? (es ? "Copiado ✓" : "Copied ✓") : (es ? "Copiar CV completo" : "Copy complete resume")}</button>
    </div>
    <p className="resume-export-note">{es ? "La descarga conserva tu experiencia original y añade únicamente la versión breve del proyecto independiente." : "The download keeps your original experience and adds only the concise independent-project version."}</p>
    {copyStatus === "error" && <p className="resume-copy-status" role="status">{es ? "No se pudo copiar. Puedes descargar el PDF." : "Could not copy. You can download the PDF."}</p>}
    {printing && createPortal(<ReferenceResumeDocument resume={adaptedResume} language={language} />, document.body)}
  </section>;
}
