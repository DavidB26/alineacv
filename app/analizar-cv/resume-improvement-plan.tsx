"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { analyzeResume } from "./analysis.mjs";
import { improvementActions, reorganizeResume } from "./resume-improvements.mjs";

type Language = "es" | "en";

export default function ResumeImprovementPlan({ result, resumeText, language, onReanalyze }: {
  result: ReturnType<typeof analyzeResume>;
  resumeText: string;
  language: Language;
  onReanalyze: () => void;
}) {
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [printing, setPrinting] = useState(false);
  const actions = useMemo(() => improvementActions(result, language), [result, language]);
  const resume = useMemo(() => reorganizeResume(resumeText), [resumeText]);
  const es = language === "es";
  const progress = actions.length ? Math.round((reviewed.length / actions.length) * 100) : 0;
  const reviewComplete = actions.length > 0 && reviewed.length === actions.length;

  useEffect(() => {
    if (!printing) return;
    const originalTitle = document.title;
    document.title = es ? "CV reorganizado" : "Reorganized resume";
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
  }, [printing, es]);

  async function copyResume() {
    try {
      await navigator.clipboard.writeText(resume.text);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <section className="resume-improvement-plan" aria-labelledby="improvement-plan-title">
      <h2 id="improvement-plan-title">{es ? "Qué cambiar o agregar" : "What to change or add"}</h2>
      <div className="improvement-progress" aria-live="polite">
        <div><strong>{reviewed.length}/{actions.length}</strong><span>{es ? "acciones revisadas" : "actions reviewed"}</span></div>
        <div className="improvement-progress-track" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
      </div>
      <ul className="improvement-checklist">
        {actions.map((action) => {
          const isReviewed = reviewed.includes(action.id);
          return <li key={action.id} className={isReviewed ? "reviewed" : ""}>
            <label htmlFor={`review-${action.id}`} aria-label={action.title}>
              <input id={`review-${action.id}`} type="checkbox" checked={isReviewed} onChange={(event) => setReviewed((previous) => event.target.checked ? [...previous, action.id] : previous.filter((id) => id !== action.id))} />
              <strong>{action.title}</strong>
            </label>
            <div className="improvement-action-body">
              {isReviewed ? <details className="improvement-action-details">
                <summary><span><b>{es ? "Evidencia" : "Evidence"}:</b> {action.evidence}</span><i>{es ? "Ver detalle" : "View details"}</i></summary>
                <p>{action.description}</p>
              </details> : <>
                <small><b>{es ? "Evidencia" : "Evidence"}:</b> {action.evidence}</small>
                <p>{action.description}</p>
              </>}
            </div>
          </li>;
        })}
      </ul>
      <div className={`improvement-primary-action ${reviewComplete ? "complete" : ""}`}>
        <button type="button" className={reviewComplete ? "ready" : ""} onClick={onReanalyze}>{es ? "Volver a analizar" : "Analyze again"}<span aria-hidden="true">→</span></button>
        <p>{reviewComplete
          ? (es ? "Sube la nueva versión para ver si mejora el puntaje." : "Upload the new version to see if the score improves.")
          : (es ? "Marca cada acción cuando termines de revisarla." : "Mark each action after you finish reviewing it.")}</p>
      </div>
      <div className="resume-export-actions" aria-label={es ? "Opciones del CV reorganizado" : "Reorganized resume options"}>
        <button type="button" onClick={() => setPrinting(true)} disabled={printing}>{es ? "Guardar CV reorganizado en PDF" : "Save reorganized resume as PDF"} <span aria-hidden="true">↓</span></button>
        <button type="button" onClick={() => void copyResume()}>{copyStatus === "copied" ? (es ? "Copiado ✓" : "Copied ✓") : (es ? "Copiar CV" : "Copy resume")}</button>
      </div>
      <p className="resume-export-note">{es ? "Reorganizamos las secciones con tu texto original. No añadimos experiencia." : "We reorganize the sections using your original text. We do not add experience."}</p>
      {copyStatus !== "idle" && <p className="resume-copy-status" role="status">{copyStatus === "copied" ? (es ? "CV reorganizado copiado." : "Reorganized resume copied.") : (es ? "No se pudo copiar. Puedes guardar el CV en PDF." : "Could not copy. You can save the resume as PDF.")}</p>}
      {printing && createPortal(
        <article className="ats-export-document" lang={language}>
          <header>{resume.header.map((line, index) => <p key={index}>{line}</p>)}</header>
          {resume.sections.map((section, index) => (
            <section key={index}><h2>{section.heading}</h2>{section.lines.map((line, lineIndex) => <p key={lineIndex}>{line}</p>)}</section>
          ))}
        </article>, document.body,
      )}
    </section>
  );
}
