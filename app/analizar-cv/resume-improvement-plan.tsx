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
    <h2 id="improvement-plan-title">{es ? "Proyectos para cubrir las brechas" : "Projects to close the gaps"}</h2>
    <p className="automatic-resume-intro">{projects.length
      ? (es
        ? `Tu CV actual tiene ${result.score ?? "—"}% de coincidencia. Ese es el puntaje real del archivo que subiste. Estos proyectos se incorporarán en la versión descargable sin alterar artificialmente ese porcentaje.`
        : `Your current resume has a ${result.score ?? "—"}% match. That is the actual score of the file you uploaded. These projects will be included in the downloadable version without artificially changing that percentage.`)
      : (es ? "Tu CV no presenta brechas de palabras clave detectables para esta oferta." : "Your resume has no detectable keyword gaps for this job.")}</p>

    {projects.length > 0 && <section className="automatic-projects" aria-labelledby="automatic-projects-title">
      <h3 id="automatic-projects-title">{es ? "Esto se añadirá al CV descargable" : "This will be added to the downloadable resume"}</h3>
      <div>
        {projects.map((project, index) => <article className="automatic-project-card" key={project.id}>
          <span className="automatic-project-number">{es ? `Proyecto sugerido ${index + 1}` : `Suggested project ${index + 1}`}</span>
          <h4>{project.title}</h4>
          <p>{project.text}</p>
          <strong className="automatic-project-keyword-label">{es ? "Requisitos que aborda" : "Requirements addressed"}</strong>
          <ul aria-label={es ? "Requisitos que aborda" : "Requirements addressed"}>
            {project.keywords.map((keyword) => <li key={keyword}>{keyword}</li>)}
          </ul>
        </article>)}
      </div>
    </section>}

    <div className="resume-export-actions" aria-label={es ? "Descargar CV adaptado" : "Download adapted resume"}>
      <button className="primary" type="button" onClick={() => setPrinting(true)} disabled={printing}>{es ? "Descargar CV completo en PDF" : "Download complete resume as PDF"} <span aria-hidden="true">↓</span></button>
      <button type="button" onClick={() => void copyResume()}>{copyStatus === "copied" ? (es ? "Copiado ✓" : "Copied ✓") : (es ? "Copiar CV completo" : "Copy complete resume")}</button>
    </div>
    <p className="resume-export-note">{es ? "La descarga conserva tu experiencia original y añade estos proyectos en una sección separada y presentable." : "The download keeps your original experience and adds these projects in a separate, polished section."}</p>
    {copyStatus === "error" && <p className="resume-copy-status" role="status">{es ? "No se pudo copiar. Puedes descargar el PDF." : "Could not copy. You can download the PDF."}</p>}
    {printing && createPortal(<ReferenceResumeDocument resume={adaptedResume} language={language} />, document.body)}
  </section>;
}
