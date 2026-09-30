"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { analyzeResume } from "./analysis.mjs";
import { adaptedSkillPlan, automaticExperienceSuggestions, buildAdaptedResume } from "./adapted-resume.mjs";

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
  const linkPattern = /^(?:https?:\/\/|www\.|(?:linkedin|github|behance|dribbble)\.com\/)|\.(?:com|net|org|io|dev|pe|co)(?:\/|$)/i;
  const contactRows = [
    resume.contactLines.filter((line) => line.includes("@") || !linkPattern.test(line)),
    resume.contactLines.filter((line) => !line.includes("@") && linkPattern.test(line)),
  ].filter((row) => row.length > 0);
  return <article className="ats-export-document reference-resume" lang={language}>
    <header className="reference-resume-header">
      <h1>{resume.name}</h1>
      <p>{resume.headline}</p>
      {contactRows.length > 0 && <div>{contactRows.map((row, rowIndex) => <p className="reference-contact-row" key={rowIndex}>{row.map((line, index) => <span key={index}>{line}</span>)}</p>)}</div>}
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

export default function ResumeImprovementPlan({ result, originalResumeText, jobDescription = "", fileName, targetLabel, versionName, language }: {
  result: ReturnType<typeof analyzeResume>;
  originalResumeText: string;
  jobDescription?: string;
  fileName: string;
  targetLabel: string;
  versionName: string;
  language: Language;
}) {
  const es = language === "es";
  const proposals = useMemo(() =>
    automaticExperienceSuggestions(result, targetLabel, originalResumeText, language),
  [result, targetLabel, originalResumeText, language]);
  const [proposalStates, setProposalStates] = useState<Record<string, "pending" | "confirmed" | "discarded">>({});
  const confirmedProposals = useMemo(() => proposals
    .filter((proposal) => proposalStates[proposal.id] === "confirmed")
    .map((proposal) => ({ ...proposal, included: true })), [proposals, proposalStates]);
  const adaptedResume = useMemo<AdaptedDocument>(() =>
    buildAdaptedResume(originalResumeText, result, targetLabel, language, { fileName, confirmedExperienceSuggestions: confirmedProposals }),
  [originalResumeText, result, targetLabel, language, fileName, confirmedProposals]);
  const adaptedResult = useMemo(() => jobDescription.trim()
    ? analyzeResume(adaptedResume.plainText, jobDescription, language, "vacancy")
    : result,
  [adaptedResume.plainText, jobDescription, language, result]);
  const skills = useMemo(() => adaptedSkillPlan(adaptedResult), [adaptedResult]);
  const [printing, setPrinting] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const eligibility = result.eligibilityChecks ?? [];
  const hasTechnicalRequirements = Boolean(skills.supportedTechnical.length + skills.supportedSoft.length + skills.developingTechnical.length + skills.developingSoft.length);
  const requirementsToConfirm = skills.developingTechnical.length + skills.developingSoft.length;
  const pendingProposals = proposals.filter((proposal) => (proposalStates[proposal.id] ?? "pending") === "pending").length;

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
    <h2 id="improvement-plan-title">{es ? "Tu CV adaptado está listo para esta oferta" : "Your tailored resume is ready for this role"}</h2>
    <p className="automatic-resume-intro">{es
      ? "Reescribimos el enfoque, priorizamos la experiencia relevante y destacamos las habilidades que ya aparecen en tu CV. Debajo encontrarás propuestas automáticas para cubrir requisitos faltantes."
      : "We rewrote the focus, prioritized relevant experience and highlighted skills already present in your resume. Below you will find automatic proposals for missing requirements."}</p>

    <div className="adapted-score-grid" aria-label={es ? "Comparación de cobertura" : "Coverage comparison"}>
      <section><span>{es ? "Coincidencia respaldada" : "Supported match"}</span><strong>{result.score ?? "—"}{result.score !== null ? "%" : ""}</strong><p>{es ? "Tu CV original, antes de incorporar propuestas." : "Your original resume before confirmed proposals."}</p></section>
      <section><span>{es ? "CV adaptado confirmado" : "Confirmed tailored resume"}</span><strong>{adaptedResult.score ?? "—"}{adaptedResult.score !== null ? "%" : ""}</strong><p>{es ? "Se recalcula con la versión que descargarás." : "Recalculated from the version you will download."}</p></section>
      <section><span>{es ? "Requisitos por acreditar" : "Requirements to verify"}</span><strong>{hasTechnicalRequirements ? requirementsToConfirm : "—"}</strong><p>{es ? "No se incluyen en el CV hasta que exista evidencia real." : "They are not included until the resume contains real evidence."}</p></section>
    </div>
    <p className="adapted-score-note">{es ? "El porcentaje no aumenta por repetir palabras: solo cambia cuando el CV contiene evidencia relacionada con cada requisito." : "The percentage does not rise by repeating keywords; it changes only when the resume contains evidence related to each requirement."}</p>

    <section className="adapted-changes" aria-labelledby="adapted-changes-title">
      <h3 id="adapted-changes-title">{es ? "Qué adaptamos" : "What we tailored"}</h3>
      <ul>
        <li><strong>{es ? "Perfil profesional" : "Professional summary"}</strong><span>{es ? "Conserva tu presentación y coloca primero el contenido relacionado con la oferta." : "Keeps your introduction and puts job-related content first."}</span></li>
        <li><strong>{es ? "Experiencia" : "Experience"}</strong><span>{es ? "Ordena primero las viñetas que respaldan los requisitos del puesto." : "Places bullets supporting the role requirements first."}</span></li>
        {skills.supportedTechnical.length > 0 && <li><strong>{es ? "Habilidades demostradas" : "Demonstrated skills"}</strong><span>{skills.supportedTechnical.join(" · ")}</span></li>}
        {skills.supportedSoft.length > 0 && <li><strong>{es ? "Competencias demostradas" : "Demonstrated strengths"}</strong><span>{skills.supportedSoft.join(" · ")}</span></li>}
        {skills.developingTechnical.length > 0 && <li><strong>{es ? "Habilidades no acreditadas" : "Unverified skills"}</strong><span>{skills.developingTechnical.join(" · ")}</span></li>}
        {skills.developingSoft.length > 0 && <li><strong>{es ? "Competencias por confirmar" : "Strengths to confirm"}</strong><span>{skills.developingSoft.join(" · ")}</span></li>}
      </ul>
    </section>

    {proposals.length > 0 && <section className="aggressive-adaptation" aria-labelledby="aggressive-adaptation-title">
      <header>
        <div><p>{es ? "ADAPTACIÓN AUTOMÁTICA" : "AUTOMATIC ADAPTATION"}</p><h3 id="aggressive-adaptation-title">{es ? "Aportes propuestos para tu experiencia" : "Proposed additions to your experience"}</h3></div>
        <span>{confirmedProposals.length}/{proposals.length} {es ? "confirmados" : "confirmed"}</span>
      </header>
      <p className="aggressive-adaptation-help">{es
        ? "Los redactamos a partir de la oferta y los distribuimos entre los puestos compatibles de tu experiencia. Confirma únicamente lo que realmente hiciste; solo entonces se incorporará al CV descargable."
        : "We drafted these from the job description and distributed them across compatible roles in your experience. Confirm only work you actually performed; only confirmed content is added to the downloadable resume."}</p>
      <div className="aggressive-proposal-list">
        {proposals.map((proposal) => {
          const state = proposalStates[proposal.id] ?? "pending";
          return <article className={`aggressive-proposal ${state}`} key={proposal.id}>
            <header><div><strong>{proposal.roleTitle}</strong>{proposal.roleDate && <small>{proposal.roleDate}</small>}</div><span role="status">{state === "confirmed" ? (es ? "Confirmado" : "Confirmed") : state === "discarded" ? (es ? "Descartado" : "Discarded") : (es ? "Por confirmar" : "Needs confirmation")}</span></header>
            <p className="aggressive-proposal-keywords">{proposal.coveredKeywords.join(" · ")}</p>
            <ul>{proposal.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
            <div>
              <button type="button" className={state === "confirmed" ? "selected" : ""} onClick={() => setProposalStates((current) => ({ ...current, [proposal.id]: "confirmed" }))}>{es ? "Sí, puedo respaldar estas viñetas" : "Yes, I can support these bullets"}</button>
              <button type="button" className={state === "discarded" ? "selected" : ""} onClick={() => setProposalStates((current) => ({ ...current, [proposal.id]: "discarded" }))}>{es ? "No corresponde" : "Not applicable"}</button>
            </div>
          </article>;
        })}
      </div>
    </section>}

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
    <p className="resume-export-note">{es
      ? `La descarga conserva tus datos, empresas, cargos y experiencia original. Además, incorpora ${confirmedProposals.length} ${confirmedProposals.length === 1 ? "propuesta confirmada" : "propuestas confirmadas"}.${pendingProposals ? ` Quedan ${pendingProposals} por revisar.` : ""}`
      : `The download keeps your original details, employers, roles and experience. It also includes ${confirmedProposals.length} confirmed ${confirmedProposals.length === 1 ? "proposal" : "proposals"}.${pendingProposals ? ` ${pendingProposals} still need review.` : ""}`}</p>
    {copyStatus === "error" && <p className="resume-copy-status" role="status">{es ? "No se pudo copiar. Puedes descargar el PDF." : "Could not copy. You can download the PDF."}</p>}
    {printing && createPortal(<ReferenceResumeDocument resume={adaptedResume} language={language} />, document.body)}
  </section>;
}
