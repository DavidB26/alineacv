"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AiLanguage, AiResumeResult, BuilderResumeDraft } from "./ai-result";
import RelatedJobs from "./related-jobs";

type Status = "idle" | "loading" | "success" | "error";
type Tab = "diagnosis" | "resume";

const dictionary = {
  es: {
    eyebrow: "Mejora con IA",
    title: "Convierte el diagnóstico en un CV más fuerte.",
    body: "La IA revisará el contexto completo, reescribirá cada sección y preparará una versión lista para editar.",
    tailoredTitle: "Adapta tu CV a esta vacante.",
    tailoredBody: "La IA contrastará los requisitos con tu experiencia y preparará una versión enfocada, sin inventar datos.",
    badgePrivate: "Datos de contacto protegidos",
    badgeFacts: "Sin inventar datos",
    consent: "Acepto enviar temporalmente a Groq una versión protegida del texto de mi CV y la vacante para generar la mejora.",
    privacy: "Antes del envío, nombre, correo, teléfono, enlaces e identificadores se reemplazan localmente. El PDF nunca se envía.",
    generate: "Generar versión mejorada",
    generateTailored: "Generar CV adaptado",
    loading: "Revisando estructura, logros y palabras clave…",
    diagnosis: "Cambios con IA",
    resume: "CV mejorado",
    target: "Enfoque sugerido",
    before: "Texto detectado",
    after: "Versión sugerida",
    why: "Por qué cambiarlo",
    priorities: { high: "Prioridad alta", medium: "Importante", low: "Opcional" },
    keywordTitle: "Estrategia de palabras clave",
    matched: "Ya presentes",
    missing: "Por incorporar",
    compatibilityTitle: "Compatibilidad semántica con la vacante",
    compatibilityMatched: "Requisitos respaldados",
    compatibilityMissing: "Brechas reales",
    compatibilityTransferable: "Fortalezas transferibles",
    compatibilityNote: "Estimación basada en evidencia del CV y requisitos de la oferta; no garantiza selección.",
    verify: "Datos que debes confirmar",
    copy: "Copiar texto",
    copied: "Copiado",
    download: "Descargar CV ATS",
    apply: "Editar en el creador",
    applyHelp: "Descarga la versión ATS ordenada o ábrela en el creador para ajustar cualquier detalle.",
    retry: "Intentar nuevamente",
    errors: {
      not_configured: "La mejora con IA aún no está configurada en este entorno.",
      rate_limit: "Hay muchas solicitudes en este momento. Espera un minuto e inténtalo nuevamente.",
      invalid_input: "El texto extraído no es suficiente para generar una mejora completa.",
      generic: "No pudimos generar la mejora. Tu análisis local sigue disponible y puedes intentarlo nuevamente.",
    },
  },
  en: {
    eyebrow: "AI improvement",
    title: "Turn the diagnosis into a stronger resume.",
    body: "AI will review the full context, rewrite each section and prepare an editable version.",
    tailoredTitle: "Tailor your resume to this job.",
    tailoredBody: "AI will compare the requirements with your experience and prepare a focused version without inventing facts.",
    badgePrivate: "Contact details protected",
    badgeFacts: "No invented facts",
    consent: "I agree to temporarily send Groq a protected version of my resume text and job description to generate the improvement.",
    privacy: "Before sending, name, email, phone, links and identifiers are replaced locally. The PDF is never uploaded.",
    generate: "Generate improved version",
    generateTailored: "Generate tailored resume",
    loading: "Reviewing structure, achievements and keywords…",
    diagnosis: "AI changes",
    resume: "Improved resume",
    target: "Suggested focus",
    before: "Detected text",
    after: "Suggested version",
    why: "Why change it",
    priorities: { high: "High priority", medium: "Important", low: "Optional" },
    keywordTitle: "Keyword strategy",
    matched: "Already present",
    missing: "Consider adding",
    compatibilityTitle: "Semantic compatibility with the job",
    compatibilityMatched: "Supported requirements",
    compatibilityMissing: "Actual gaps",
    compatibilityTransferable: "Transferable strengths",
    compatibilityNote: "Estimate based on resume evidence and job requirements; it does not guarantee selection.",
    verify: "Facts to verify",
    copy: "Copy text",
    copied: "Copied",
    download: "Download ATS resume",
    apply: "Edit in builder",
    applyHelp: "Download the formatted ATS version or open it in the builder to adjust any detail.",
    retry: "Try again",
    errors: {
      not_configured: "AI improvement has not been configured in this environment yet.",
      rate_limit: "There are too many requests right now. Wait a minute and try again.",
      invalid_input: "The extracted text is not sufficient to generate a complete improvement.",
      generic: "We could not generate the improvement. Your local analysis is still available and you can try again.",
    },
  },
} as const;

function protectPrivateText(resumeText: string, jobDescription: string) {
  const replacements: Array<[string, string]> = [];
  let tokenIndex = 0;
  const replace = (value: string, label: string) => {
    tokenIndex += 1;
    const token = `[[ALINEACV_${label}_${tokenIndex}]]`;
    replacements.push([token, value]);
    return token;
  };
  const protectContacts = (text: string) => {
    let protectedText = text
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, (match) => replace(match, "EMAIL"))
      .replace(/\b(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:linkedin\.com|github\.com|gitlab\.com)\/[^\s<>"']+/gi, (match) => replace(match, "URL"))
      .replace(/\b(?:DNI|documento(?: de identidad)?|national id|passport|pasaporte|c[eé]dula)\s*[:#-]?\s*[A-Z0-9.-]{5,20}\b/gi, (match) => replace(match, "ID"))
      .replace(/\b(?:fecha de nacimiento|date of birth|birth date|DOB)\s*[:#-]?\s*[^\n,;]{4,30}/gi, (match) => replace(match, "BIRTH_DATE"));
    protectedText = protectedText.replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, (match) => {
      return match.replace(/\D/g, "").length >= 8 ? replace(match, "PHONE") : match;
    });
    return protectedText;
  };

  let protectedResume = protectContacts(resumeText);
  const firstLine = protectedResume.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  if (firstLine && firstLine.length <= 80 && /^[\p{L}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}][\p{L}\p{M}'’.-]*){1,5}$/u.test(firstLine)) {
    protectedResume = protectedResume.split(firstLine).join(replace(firstLine, "NAME"));
  }

  return { resumeText: protectedResume, jobDescription: protectContacts(jobDescription), replacements };
}

function restorePrivateValues<T>(value: T, replacements: Array<[string, string]>): T {
  if (typeof value === "string") {
    return replacements.reduce((text, [token, original]) => text.split(token).join(original), value) as T;
  }
  if (Array.isArray(value)) return value.map((item) => restorePrivateValues(item, replacements)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restorePrivateValues(item, replacements)])) as T;
  }
  return value;
}

function responsibilityLines(text: string) {
  return text
    .replace(/\s*[•▪◦]\s*/g, "\n")
    .replace(/\s+[–—-]\s+(?=[\p{Lu}ÁÉÍÓÚÑ])/gu, "\n")
    .split(/\n+/)
    .map((item) => item.replace(/^[•▪◦·\-–—]\s*/, "").trim())
    .filter(Boolean);
}

function normalizeAiResult(result: AiResumeResult): AiResumeResult {
  return {
    ...result,
    builderData: {
      ...result.builderData,
      experience: result.builderData.experience.map((item) => ({
        ...item,
        responsibilities: responsibilityLines(item.responsibilities).join("\n"),
      })),
    },
  };
}

function createBuilderResume(draft: BuilderResumeDraft) {
  const stamp = Date.now();
  const blankEducation = { institution: "", degree: "", location: "", startDate: "", endDate: "", description: "" };
  const blankExperience = { company: "", position: "", location: "", startDate: "", endDate: "", responsibilities: "" };
  const education = draft.education.length ? draft.education : [blankEducation];
  const experience = draft.experience.length ? draft.experience : [blankExperience];

  return {
    personal: { ...draft.personal, photo: "" },
    education: education.map((item, index) => ({ ...item, id: `education-ai-${stamp}-${index}` })),
    experience: experience.map((item, index) => ({ ...item, id: `experience-ai-${stamp}-${index}` })),
    skills: {
      ...draft.skills,
      certifications: draft.skills.certifications.map((item, index) => ({ ...item, id: `certification-ai-${stamp}-${index}` })),
    },
  };
}

export default function AiImprover({
  resumeText,
  jobDescription,
  language,
  onAdapt,
}: {
  resumeText: string;
  jobDescription: string;
  language: AiLanguage;
  onAdapt: (description: string, title: string) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<AiResumeResult | null>(null);
  const [errorCode, setErrorCode] = useState("");
  const [tab, setTab] = useState<Tab>("diagnosis");
  const [copied, setCopied] = useState(false);
  const [printing, setPrinting] = useState(false);
  const copy = dictionary[language];
  const hasVacancy = jobDescription.trim().length > 0;

  useEffect(() => {
    if (!printing || !result) return;
    const previousTitle = document.title;
    const finish = () => setPrinting(false);
    document.body.classList.add("alineacv-ai-printing");
    document.title = `${result.builderData.personal.fullName || "CV"} - CV ATS`;
    window.addEventListener("afterprint", finish, { once: true });
    const timer = window.setTimeout(() => window.print(), 160);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("alineacv-ai-printing");
      document.title = previousTitle;
    };
  }, [printing, result]);

  async function generateImprovement() {
    if (!consent || !resumeText || status === "loading") return;
    setStatus("loading");
    setErrorCode("");
    setResult(null);

    try {
      const protectedPayload = protectPrivateText(resumeText, jobDescription);
      const response = await fetch("/api/improve-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: protectedPayload.resumeText, jobDescription: protectedPayload.jobDescription, language }),
      });
      const payload = await response.json() as AiResumeResult | { code?: string };
      if (!response.ok || !("improvedResume" in payload)) {
        setErrorCode("code" in payload && payload.code ? payload.code : "generic");
        setStatus("error");
        return;
      }
      setResult(normalizeAiResult(restorePrivateValues(payload, protectedPayload.replacements)));
      setStatus("success");
      setTab("diagnosis");
    } catch {
      setErrorCode("generic");
      setStatus("error");
    }
  }

  async function copyResume() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.improvedResume);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  function applyToBuilder() {
    if (!result) return;
    const resume = createBuilderResume(result.builderData);
    window.localStorage.setItem("alineacv-resume-v1", JSON.stringify({
      resume,
      language,
      template: "classic",
      noExperience: result.builderData.noExperience,
    }));
    window.location.assign("/");
  }

  function downloadAtsPdf() {
    if (!result || printing) return;
    setPrinting(true);
  }

  const error = errorCode === "not_configured"
    ? copy.errors.not_configured
    : errorCode === "rate_limit"
      ? copy.errors.rate_limit
      : errorCode === "invalid_input"
        ? copy.errors.invalid_input
        : copy.errors.generic;

  return (
    <section className="ats-ai-section" id="ats-ai-improver">
      <div className="ats-ai-heading">
        <div>
          <p>{copy.eyebrow}</p>
          <h3>{hasVacancy ? copy.tailoredTitle : copy.title}</h3>
          <span>{hasVacancy ? copy.tailoredBody : copy.body}</span>
        </div>
        <div className="ats-ai-badges"><span>✓ {copy.badgePrivate}</span><span>✓ {copy.badgeFacts}</span></div>
      </div>

      {!result && (
        <div className="ats-ai-permission">
          <label>
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>{copy.consent}</span>
          </label>
          <p>{copy.privacy}</p>
          <button type="button" disabled={!consent || status === "loading"} onClick={generateImprovement}>
            {status === "loading" ? copy.loading : status === "error" ? copy.retry : hasVacancy ? copy.generateTailored : copy.generate}
            <span aria-hidden="true">{status === "loading" ? "…" : "→"}</span>
          </button>
          {status === "error" && <div className="ats-ai-error" role="alert">{error}</div>}
        </div>
      )}

      {result && (
        <div className="ats-ai-result">
          <div className="ats-ai-tabs" role="tablist" aria-label={copy.eyebrow}>
            <button type="button" role="tab" aria-selected={tab === "diagnosis"} className={tab === "diagnosis" ? "active" : ""} onClick={() => setTab("diagnosis")}>{copy.diagnosis}</button>
            <button type="button" role="tab" aria-selected={tab === "resume"} className={tab === "resume" ? "active" : ""} onClick={() => setTab("resume")}>{copy.resume}</button>
          </div>

          {tab === "diagnosis" ? (
            <div className="ats-ai-diagnosis" role="tabpanel">
              <div className="ats-ai-overview">
                <span>{copy.target}: {result.targetRole}</span>
                <h4>{result.headline}</h4>
                <p>{result.overallAssessment}</p>
              </div>
              {hasVacancy && <section className="ats-ai-compatibility">
                <header>
                  <h4>{copy.compatibilityTitle}</h4>
                  <strong>{result.compatibility.score}%</strong>
                </header>
                <div className="ats-ai-compatibility-bar" role="progressbar" aria-label={`${copy.compatibilityTitle}: ${result.compatibility.score}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.compatibility.score}>
                  <i style={{ width: `${result.compatibility.score}%` }} />
                </div>
                {result.compatibility.explanation && <p>{result.compatibility.explanation}</p>}
                <div className="ats-ai-compatibility-groups">
                  <article><span>{copy.compatibilityMatched}</span><p>{result.compatibility.matchedRequirements.join(", ") || "—"}</p></article>
                  <article><span>{copy.compatibilityMissing}</span><p>{result.compatibility.missingRequirements.join(", ") || "—"}</p></article>
                  {result.compatibility.transferableStrengths.length > 0 && <article><span>{copy.compatibilityTransferable}</span><p>{result.compatibility.transferableStrengths.join(", ")}</p></article>}
                </div>
                <small>{copy.compatibilityNote}</small>
              </section>}
              <div className="ats-ai-recommendations">
                {result.recommendations.map((item, index) => (
                  <article key={`${item.section}-${index}`}>
                    <header><span className={item.priority}>{copy.priorities[item.priority]}</span><strong>{item.section}</strong></header>
                    <h5>{item.issue}</h5>
                    {item.evidence && <div><small>{copy.before}</small><p>{item.evidence}</p></div>}
                    <div className="improved"><small>{copy.after}</small><p>{item.improvedExample}</p></div>
                    <footer><strong>{copy.why}</strong><p>{item.recommendation}</p></footer>
                  </article>
                ))}
              </div>
              {(result.keywords.matched.length > 0 || result.keywords.missing.length > 0 || result.keywords.advice.length > 0) && (
                <section className="ats-ai-keywords">
                  <h4>{copy.keywordTitle}</h4>
                  <div>
                    <article><span>{copy.matched}</span><p>{result.keywords.matched.join(", ") || "—"}</p></article>
                    <article><span>{copy.missing}</span><p>{result.keywords.missing.join(", ") || "—"}</p></article>
                  </div>
                  {result.keywords.advice.length > 0 && <ul>{result.keywords.advice.map((item) => <li key={item}>{item}</li>)}</ul>}
                </section>
              )}
              {result.factsToVerify.length > 0 && <section className="ats-ai-verify"><h4>{copy.verify}</h4><ul>{result.factsToVerify.map((item) => <li key={item}>{item}</li>)}</ul></section>}
            </div>
          ) : (
            <div className="ats-ai-resume" role="tabpanel">
              <pre>{result.improvedResume}</pre>
              <p>{copy.applyHelp}</p>
              <div className="ats-ai-resume-actions">
                <button type="button" onClick={copyResume}>{copied ? copy.copied : copy.copy}</button>
                <button type="button" onClick={applyToBuilder}>{copy.apply}</button>
                <button type="button" className="primary" onClick={downloadAtsPdf}>{copy.download} ↓</button>
              </div>
            </div>
          )}
          <RelatedJobs
            role={result.jobSearch?.query || result.targetRole || result.builderData.personal.role}
            industry={result.jobSearch?.industry || ""}
            skills={result.builderData.skills.technical}
            location={result.builderData.personal.location}
            language={language}
            onAdapt={onAdapt}
          />
        </div>
      )}
      {printing && result && typeof document !== "undefined" && createPortal(
        <AtsPrintDocument draft={result.builderData} language={language} />,
        document.body,
      )}
    </section>
  );
}

function AtsPrintDocument({ draft, language }: { draft: BuilderResumeDraft; language: AiLanguage }) {
  const labels = language === "es"
    ? { profile: "Perfil profesional", experience: "Experiencia profesional", education: "Educación", skills: "Habilidades", technical: "Habilidades técnicas", languages: "Idiomas", additional: "Habilidades adicionales", certifications: "Certificaciones" }
    : { profile: "Professional profile", experience: "Professional experience", education: "Education", skills: "Skills", technical: "Technical skills", languages: "Languages", additional: "Additional skills", certifications: "Certifications" };
  const contact = [draft.personal.location, draft.personal.phone, draft.personal.email, draft.personal.linkedin, draft.personal.website].filter(Boolean);
  const experience = draft.noExperience ? [] : draft.experience.filter((item) => item.company || item.position || item.responsibilities);
  const education = draft.education.filter((item) => item.institution || item.degree || item.description);
  const certifications = draft.skills.certifications.filter((item) => item.name || item.date);
  const hasSkills = Boolean(draft.skills.technical || draft.skills.languages || draft.skills.additional);
  const range = (start: string, end: string) => start && end ? `${start} — ${end}` : start || end;

  return (
    <article className="ats-ai-print-document" aria-label={language === "es" ? "CV ATS listo para descargar" : "ATS resume ready to download"}>
      <header>
        {draft.personal.role && <p>{draft.personal.role}</p>}
        <h1>{draft.personal.fullName || (language === "es" ? "Currículum" : "Resume")}</h1>
        {contact.length > 0 && <span>{contact.join(" · ")}</span>}
      </header>

      {draft.personal.summary && <section><h2>{labels.profile}</h2><p>{draft.personal.summary}</p></section>}

      {experience.length > 0 && <section>
        <h2>{labels.experience}</h2>
        {experience.map((item, index) => (
          <article className="ats-ai-print-entry" key={`${item.company}-${item.position}-${index}`}>
            <div><strong>{item.position || item.company}</strong><time>{range(item.startDate, item.endDate)}</time></div>
            {(item.position && item.company || item.location) && <span>{item.position && item.company ? item.company : ""}{item.location ? `${item.position && item.company ? " · " : ""}${item.location}` : ""}</span>}
            {item.responsibilities && <ul>{responsibilityLines(item.responsibilities).map((line) => <li key={line}>{line}</li>)}</ul>}
          </article>
        ))}
      </section>}

      {education.length > 0 && <section>
        <h2>{labels.education}</h2>
        {education.map((item, index) => (
          <article className="ats-ai-print-entry" key={`${item.institution}-${item.degree}-${index}`}>
            <div><strong>{item.degree || item.institution}</strong><time>{range(item.startDate, item.endDate)}</time></div>
            {(item.degree && item.institution || item.location) && <span>{item.degree && item.institution ? item.institution : ""}{item.location ? `${item.degree && item.institution ? " · " : ""}${item.location}` : ""}</span>}
            {item.description && <p>{item.description}</p>}
          </article>
        ))}
      </section>}

      {hasSkills && <section><h2>{labels.skills}</h2>
        {draft.skills.technical && <p><strong>{labels.technical}:</strong> {draft.skills.technical}</p>}
        {draft.skills.languages && <p><strong>{labels.languages}:</strong> {draft.skills.languages}</p>}
        {draft.skills.additional && <p><strong>{labels.additional}:</strong> {draft.skills.additional}</p>}
      </section>}

      {certifications.length > 0 && <section><h2>{labels.certifications}</h2><ul className="ats-ai-print-certifications">{certifications.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}</span><time>{item.date}</time></li>)}</ul></section>}
    </article>
  );
}
