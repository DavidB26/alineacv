"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { analyzeResume } from "./analysis.mjs";
import { adaptedSkillPlan, buildAtsResume, buildAdaptedResume, missingEvidenceQuestions, confirmResumeEvidence, confirmEligibilityEvidence } from "./adapted-resume.mjs";

type Language = "es" | "en";
type ResumeBlock =
  | { type: "entry"; title: string; date: string; meta: string[]; bullets: string[] }
  | { type: "row"; label: string; value: string }
  | { type: "paragraph"; text: string };
type EvidenceQuestion = { id: string; keyword: string; coveredKeywords: string[]; roles: Array<{ title: string; date: string }>; roleIndex: string; draftText: string };
type EligibilityItem = { id: string; label: string; evidence: string; status: string; draftText?: string };
type ConfirmedEligibility = { id: string; confirmed: boolean; text: string };
type ConfirmedEvidence = { id: string; included: boolean; roleTitle: string; roleDate: string; coveredKeywords: string[]; bullets: string[] };
type AdaptedDocument = {
  name: string;
  headline: string;
  contactLines: string[];
  sections: Array<{ kind: string; heading: string; blocks: ResumeBlock[] }>;
  plainText: string;
  skillGroupHeading?: string;
};

export function ReferenceResumeDocument({ resume, language }: { resume: AdaptedDocument; language: Language }) {
  const linkPattern = /^(?:https?:\/\/|www\.|(?:linkedin|github|behance|dribbble)\.com\/)|\.(?:com|net|org|io|dev|pe|co)(?:\/|$)/i;
  const contactRows = [
    resume.contactLines.filter((line) => line.includes("@") || !linkPattern.test(line)),
    resume.contactLines.filter((line) => !line.includes("@") && linkPattern.test(line)),
  ].filter((row) => row.length > 0);
  const skillSections = resume.sections.filter(section => ["tools", "skills", "technicalSkills", "softSkills"].includes(section.kind));
  const renderSection = (section: AdaptedDocument["sections"][number], nested = false) => <section className={"reference-section reference-section-" + section.kind} key={section.kind}>
        {nested ? <h3>{section.heading}</h3> : <h2>{section.heading}</h2>}
        {section.blocks.map((block, index) => {
          if (block.type === "entry") return <article className="reference-entry" key={index}>
            {(block.title || block.date) && <header><strong>{block.title}</strong>{block.date && <time>{block.date}</time>}</header>}
            {block.meta.map((line, metaIndex) => <p className="reference-entry-meta" key={metaIndex}>{line}</p>)}
            {block.bullets.length > 0 && <ul>{block.bullets.map((line, bulletIndex) => <li key={bulletIndex}>{line}</li>)}</ul>}
          </article>;
          if (block.type === "row") return <p className="reference-row" key={index}><strong>{block.label}:</strong><span>{block.value}</span></p>;
          return <p key={index}>{block.text}</p>;
        })}
      </section>;
  return <article className="ats-export-document reference-resume" lang={language}>
    <header className="reference-resume-header">
      <h1>{resume.name}</h1>
      <p>{resume.headline}</p>
      {contactRows.length > 0 && <div>{contactRows.map((row, rowIndex) => <p className="reference-contact-row" key={rowIndex}>{row.map((line, index) => <span key={index}>{line}</span>)}</p>)}</div>}
    </header>
    <main>
      {resume.sections.map((section) => {
        if (!resume.skillGroupHeading || !skillSections.includes(section)) return renderSection(section);
        if (section !== skillSections[0]) return null;
        return <section className="reference-section reference-skills-group" key="skills-group">
          <h2>{resume.skillGroupHeading}</h2>
          {skillSections.map(section => renderSection(section, true))}
        </section>;
      })}
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
  const proposals = useMemo<EvidenceQuestion[]>(() =>
    missingEvidenceQuestions(result, originalResumeText, language),
  [result, originalResumeText, language]);
  const [answers, setAnswers] = useState<Record<string, { roleIndex: string; text: string; confirmed: boolean; discarded?: boolean }>>({});
  const confirmedProposals = useMemo<ConfirmedEvidence[]>(() => proposals
    .map((proposal) => confirmResumeEvidence(proposal, answers[proposal.id] ? { ...answers[proposal.id], confirmed: !answers[proposal.id].discarded } : { text: proposal.draftText, roleIndex: proposal.roleIndex, confirmed: true }))
    .filter((proposal): proposal is ConfirmedEvidence => Boolean(proposal)), [proposals, answers]);
  const eligibility = useMemo<EligibilityItem[]>(() => result.eligibilityChecks ?? [], [result]);
  const [eligibilityAnswers, setEligibilityAnswers] = useState<Record<string, { text: string; confirmed: boolean; discarded?: boolean }>>({});
  const confirmedEligibility = useMemo<ConfirmedEligibility[]>(() => eligibility.filter((item) => item.status !== "matched")
    .map((item) => confirmEligibilityEvidence(item, eligibilityAnswers[item.id] ? { ...eligibilityAnswers[item.id], confirmed: !eligibilityAnswers[item.id].discarded } : { text: item.draftText ?? item.label, confirmed: true }))
    .filter((item): item is ConfirmedEligibility => Boolean(item)), [eligibility, eligibilityAnswers]);
  const atsResume = useMemo<AdaptedDocument>(() => buildAtsResume(originalResumeText, language, { fileName }), [originalResumeText, language, fileName]);
  const adaptedResume = useMemo<AdaptedDocument>(() =>
    buildAdaptedResume(originalResumeText, result, targetLabel, language, { fileName, confirmedExperienceSuggestions: confirmedProposals, confirmedEligibility }),
  [originalResumeText, result, targetLabel, language, fileName, confirmedProposals, confirmedEligibility]);
  const adaptedResult = useMemo(() => jobDescription.trim()
    ? analyzeResume(adaptedResume.plainText, jobDescription, language, "vacancy")
    : result,
  [adaptedResume.plainText, jobDescription, language, result]);
  const skills = useMemo(() => adaptedSkillPlan(adaptedResult), [adaptedResult]);
  const [printing, setPrinting] = useState<false | "ats" | "adapted">(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const hasTechnicalRequirements = Boolean(skills.supportedTechnical.length + skills.supportedSoft.length + skills.developingTechnical.length + skills.developingSoft.length);
  const requirementsToConfirm = skills.developingTechnical.length + skills.developingSoft.length;
  const pendingProposals = proposals.filter((proposal) => !answers[proposal.id]?.confirmed && !answers[proposal.id]?.discarded).length;

  useEffect(() => {
    if (!printing) return;
    const originalTitle = document.title;
    document.title = printing === "ats" ? "CV ATS - " + atsResume.name : versionName;
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
  }, [printing, versionName, atsResume.name]);

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
      ? "Primero ordenamos tu CV en formato ATS conservando su información. Después destacamos lo relevante para la oferta. Las adiciones basadas en la oferta aparecen listas para revisar. Puedes confirmarlas, editarlas o descartarlas antes de descargar."
      : "First we organize your resume in ATS format while preserving its information. Then we highlight relevant evidence for the role. Job-based additions are ready to review. You can confirm, edit or discard them before downloading."}</p>

    <div className="adapted-score-grid" aria-label={es ? "Comparación de cobertura" : "Coverage comparison"}>
      <section><span>{es ? "Coincidencia respaldada" : "Supported match"}</span><strong>{result.score ?? "—"}{result.score !== null ? "%" : ""}</strong><p>{es ? "Tu CV original, antes de incorporar propuestas." : "Your original resume before confirmed proposals."}</p></section>
      <section><span>{es ? "CV adaptado con adiciones" : "Tailored resume with additions"}</span><strong>{adaptedResult.score ?? "—"}{adaptedResult.score !== null ? "%" : ""}</strong><p>{es ? "Se recalcula con la versión que descargarás." : "Recalculated from the version you will download."}</p></section>
      <section><span>{es ? "Requisitos por acreditar" : "Requirements to verify"}</span><strong>{hasTechnicalRequirements ? requirementsToConfirm : "—"}</strong><p>{es ? "Revisa las adiciones propuestas para estos requisitos." : "Review the proposed additions for these requirements."}</p></section>
    </div>
    <p className="adapted-score-note">{es ? "La coincidencia de la versión adaptada incluye las adiciones propuestas; revisa que describan la experiencia del candidato." : "The tailored match includes proposed additions; review them against the candidate’s experience."}</p>

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

    {proposals.length > 0 && <section className="aggressive-adaptation" aria-labelledby="evidence-title">
      <header><div><p>{es ? "INFORMACIÓN POR CONFIRMAR" : "INFORMATION TO CONFIRM"}</p><h3 id="evidence-title">{es ? "Adiciones propuestas para la oferta" : "Proposed additions for the role"}</h3></div></header>
      <p>{es ? "Preparamos estas adiciones según la oferta y las incorporamos a la versión adaptada. Revisa el texto y el empleo propuesto; puedes confirmar, editar o descartar cada adición." : "We prepared these additions from the job description and included them in the tailored version. Review the text and suggested job; you can confirm, edit or discard each addition."}</p>
      <div className="aggressive-proposal-list">{proposals.map((proposal) => {
        const answer = answers[proposal.id] ?? { roleIndex: proposal.roleIndex, text: proposal.draftText, confirmed: false };
        const update = (patch: Partial<typeof answer>) => setAnswers((current) => ({ ...current, [proposal.id]: { ...answer, ...patch } }));
        return <article className="aggressive-proposal" key={proposal.id}>
          <h4>{proposal.keyword}</h4>
          <label htmlFor={proposal.id + "-role"}>{es ? "¿En qué empleo lo realizó?" : "In which job did the candidate apply it?"}</label>
          <select id={proposal.id + "-role"} value={answer.roleIndex} onChange={(event) => update({ roleIndex: event.target.value, confirmed: false, discarded: false })}>
            <option value="">{es ? "Selecciona un empleo" : "Select a job"}</option>
            {proposal.roles.map((role, index) => <option key={index} value={index}>{role.title} {role.date}</option>)}
          </select>
          <label htmlFor={proposal.id + "-text"}>{es ? "Revisa o describe la actividad realizada" : "Review or describe the activity performed"}</label>
          <textarea id={proposal.id + "-text"} rows={3} value={answer.text} onChange={(event) => update({ text: event.target.value, confirmed: false, discarded: false })} />
          {!proposal.roles.length && <p>{es ? "Completa tus empleos en el CV original para asociar esta información." : "Add your jobs to the original resume to associate this information."}</p>}
          <div>
            <button type="button" disabled={answer.roleIndex === "" || answer.text.trim().length < 15} onClick={() => update({ confirmed: true, discarded: false })}>{es ? "Confirmar adición" : "Confirm addition"}</button>
            <button type="button" onClick={() => update({ confirmed: false, discarded: true })}>{es ? "Descartar adición" : "Discard addition"}</button>
          </div>
          <span role="status">{answer.confirmed ? (es ? "Adición confirmada" : "Addition confirmed") : answer.discarded ? (es ? "No se agregará" : "Will not be added") : (es ? "Adición propuesta incluida" : "Proposed addition included")}</span>
        </article>;
      })}</div>
    </section>}

    {eligibility.length > 0 && <section className="offer-eligibility" aria-labelledby="offer-eligibility-title">
      <h3 id="offer-eligibility-title">{es ? "Adiciones sobre requisitos personales" : "Personal requirement additions"}</h3>
      <p>{es ? "Idiomas, estudios, residencia y años de experiencia se mantienen separados porque no pueden completarse mediante palabras clave." : "Languages, education, residence and years of experience stay separate because keywords cannot complete them."}</p>
      <p>{es ? "El sistema prepara las adiciones usando la oferta y las fechas del CV. Solo revisa qué se está agregando: puedes confirmar, editar o descartar." : "The system prepares additions using the role and employment dates. Review what is being added: you can confirm, edit or discard."}</p>
      <ul>{eligibility.map((item) => {
        const answer = eligibilityAnswers[item.id];
        const text = answer?.text ?? item.draftText ?? item.label;
        const confirmed = Boolean(answer?.confirmed);
        return <li key={item.id}>
        <div><strong>{item.label}</strong><span>{item.evidence}</span></div>
        <span className={`offer-eligibility-status ${confirmed ? "matched" : item.status}`}>
          {confirmed ? (es ? "Adición confirmada" : "Addition confirmed") : item.status === "matched" ? (es ? "Detectado" : "Found") : item.status === "missing" ? (es ? "No encontrado en original" : "Not found in original") : (es ? "Revisar adición" : "Review addition")}
        </span>
        {item.status !== "matched" && <div className="eligibility-confirmation">
          <label htmlFor={item.id + "-confirmation"}>{es ? "Adición propuesta para el CV" : "Proposed resume addition"}</label>
          <textarea id={item.id + "-confirmation"} rows={2} value={text} onChange={(event) => setEligibilityAnswers((current) => ({ ...current, [item.id]: { text: event.target.value, confirmed: false, discarded: false } }))} />
          <button type="button" disabled={!text.trim()} onClick={() => setEligibilityAnswers((current) => ({ ...current, [item.id]: { text, confirmed: !confirmed, discarded: false } }))}>{confirmed ? (es ? "Volver a propuesta" : "Return to proposal") : (es ? "Confirmar adición" : "Confirm addition")}</button>
          <button type="button" onClick={() => setEligibilityAnswers((current) => ({ ...current, [item.id]: { text, confirmed: false, discarded: true } }))}>{es ? "Descartar adición" : "Discard addition"}</button>
          <span role="status">{answer?.discarded ? (es ? "No se agregará" : "Will not be added") : confirmed ? (es ? "Adición confirmada" : "Addition confirmed") : item.status !== "matched" ? (es ? "Adición propuesta incluida" : "Proposed addition included") : ""}</span>
        </div>}
      </li>;
      })}</ul>
    </section>}

    <div className="resume-export-actions" aria-label={es ? "Descargar CV adaptado" : "Download tailored resume"}>
      <button className="primary" type="button" onClick={() => setPrinting("adapted")} disabled={Boolean(printing)}>{es ? "Descargar CV adaptado en PDF" : "Download tailored resume as PDF"} <span aria-hidden="true">↓</span></button>
      <button type="button" disabled={Boolean(printing)} onClick={() => setPrinting("ats")}>{es ? "Descargar solo formato ATS" : "Download ATS format only"}</button>
      <button type="button" onClick={() => void copyResume()}>{copyStatus === "copied" ? (es ? "Copiado ✓" : "Copied ✓") : (es ? "Copiar CV adaptado" : "Copy tailored resume")}</button>
    </div>
    <p className="resume-export-note">{es
      ? `La descarga conserva tus datos, empresas, cargos y experiencia original. Además, incorpora ${confirmedProposals.length + confirmedEligibility.length} ${confirmedProposals.length + confirmedEligibility.length === 1 ? "adición" : "adiciones"}.${pendingProposals ? ` Quedan ${pendingProposals} por revisar.` : ""}`
      : `The download keeps your original details, employers, roles and experience. It also includes ${confirmedProposals.length + confirmedEligibility.length} proposed ${confirmedProposals.length + confirmedEligibility.length === 1 ? "proposal" : "proposals"}.${pendingProposals ? ` ${pendingProposals} still need review.` : ""}`}</p>
    {copyStatus === "error" && <p className="resume-copy-status" role="status">{es ? "No se pudo copiar. Puedes descargar el PDF." : "Could not copy. You can download the PDF."}</p>}
    {printing && createPortal(<ReferenceResumeDocument resume={printing === "ats" ? atsResume : adaptedResume} language={language} />, document.body)}
  </section>;
}
