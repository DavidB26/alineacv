"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { analyzeResume } from "./analysis.mjs";
import { adaptedSkillPlan, buildAdaptedResume } from "./adapted-resume.mjs";

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
  const skills = useMemo(() => adaptedSkillPlan(result), [result]);
  const adaptedResume = useMemo<AdaptedDocument>(() =>
    buildAdaptedResume(originalResumeText, result, targetLabel, language, { fileName }),
  [originalResumeText, result, targetLabel, language, fileName]);
  const [printing, setPrinting] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const eligibility = result.eligibilityChecks ?? [];
  const hasTechnicalRequirements = Boolean(skills.supportedTechnical.length + skills.supportedSoft.length + skills.developingTechnical.length + skills.developingSoft.length);
  const adaptedCoverage = hasTechnicalRequirements ? 100 : null;

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

  return <section className="resume-improvement-plan adapted-resume-plan" aria-labelledby="improvement-plan-title">
    <h2 id="improvement-plan-title">{es ? "Tu CV adaptado está listo" : "Your tailored resume is ready"}</h2>
    <p className="automatic-resume-intro">{es
      ? "Priorizamos la experiencia más relevante, ajustamos el perfil y organizamos las habilidades con el lenguaje de la oferta. No añadimos empleos ni responsabilidades inexistentes."
      : "We prioritized the most relevant experience, tailored the summary and organized skills using the job's language. We did not add nonexistent jobs or responsibilities."}</p>

    <div className="adapted-score-grid" aria-label={es ? "Comparación de cobertura" : "Coverage comparison"}>
      <section><span>{es ? "Coincidencia respaldada" : "Supported match"}</span><strong>{result.score ?? "—"}{result.score !== null ? "%" : ""}</strong><p>{es ? "Basada en información ya presente en tu CV." : "Based on information already present in your resume."}</p></section>
      <section><span>{es ? "Cobertura técnica adaptada" : "Tailored technical coverage"}</span><strong>{adaptedCoverage ?? "—"}{adaptedCoverage !== null ? "%" : ""}</strong><p>{es ? "Incluye los términos faltantes como habilidades en desarrollo." : "Includes missing terms as skills in development."}</p></section>
    </div>
    <p className="adapted-score-note">{es ? "La cobertura técnica indica que los términos fueron ubicados en el CV; no acredita dominio ni garantiza una entrevista." : "Technical coverage means the terms were placed in the resume; it does not prove proficiency or guarantee an interview."}</p>

    <section className="adapted-changes" aria-labelledby="adapted-changes-title">
      <h3 id="adapted-changes-title">{es ? "Qué adaptamos" : "What we tailored"}</h3>
      <ul>
        <li><strong>{es ? "Perfil y experiencia" : "Summary and experience"}</strong><span>{es ? "Priorizados según las coincidencias reales con la oferta." : "Prioritized using real matches with the job."}</span></li>
        {skills.supportedTechnical.length > 0 && <li><strong>{es ? "Habilidades demostradas" : "Demonstrated skills"}</strong><span>{skills.supportedTechnical.join(" · ")}</span></li>}
        {skills.supportedSoft.length > 0 && <li><strong>{es ? "Competencias demostradas" : "Demonstrated strengths"}</strong><span>{skills.supportedSoft.join(" · ")}</span></li>}
        {skills.developingTechnical.length > 0 && <li><strong>{es ? "Habilidades técnicas en desarrollo" : "Technical skills in development"}</strong><span>{skills.developingTechnical.join(" · ")}</span></li>}
        {skills.developingSoft.length > 0 && <li><strong>{es ? "Competencias en desarrollo" : "Strengths in development"}</strong><span>{skills.developingSoft.join(" · ")}</span></li>}
      </ul>
    </section>

    {eligibility.length > 0 && <section className="offer-eligibility" aria-labelledby="offer-eligibility-title">
      <h3 id="offer-eligibility-title">{es ? "Requisitos personales por revisar" : "Personal requirements to review"}</h3>
      <p>{es ? "Idiomas, estudios, residencia y años de experiencia se mantienen separados porque no pueden completarse mediante palabras clave." : "Languages, education, residence and years of experience stay separate because keywords cannot complete them."}</p>
      <ul>{eligibility.map((item) => <li key={item.id}>
        <div><strong>{item.label}</strong><span>{item.evidence}</span></div>
        <span className={`offer-eligibility-status ${item.status}`}>
          {item.status === "matched" ? (es ? "Detectado" : "Found") : item.status === "missing" ? (es ? "No acreditado" : "Not shown") : (es ? "Confirmar" : "Confirm")}
        </span>
      </li>)}</ul>
    </section>}

    <div className="resume-export-actions" aria-label={es ? "Descargar CV adaptado" : "Download tailored resume"}>
      <button className="primary" type="button" onClick={() => setPrinting(true)} disabled={printing}>{es ? "Descargar CV adaptado en PDF" : "Download tailored resume as PDF"} <span aria-hidden="true">↓</span></button>
      <button type="button" onClick={() => void copyResume()}>{copyStatus === "copied" ? (es ? "Copiado ✓" : "Copied ✓") : (es ? "Copiar CV adaptado" : "Copy tailored resume")}</button>
    </div>
    <p className="resume-export-note">{es ? "La descarga conserva tus empresas, cargos y experiencia original; reorganiza el contenido y distingue las habilidades en desarrollo." : "The download keeps your original employers, roles and experience; it reorganizes the content and distinguishes skills in development."}</p>
    {copyStatus === "error" && <p className="resume-copy-status" role="status">{es ? "No se pudo copiar. Puedes descargar el PDF." : "Could not copy. You can download the PDF."}</p>}
    {printing && createPortal(<ReferenceResumeDocument resume={adaptedResume} language={language} />, document.body)}
  </section>;
}
