"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Native anchors avoid vinext beta client-navigation failures in production. */

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { analyzeResume } from "./analysis.mjs";
import AiImprover from "./ai-improver";
import HeaderNavigation from "../header-navigation";

type Language = "es" | "en";
type Status = "idle" | "reading" | "analyzing" | "ready" | "error";

const dictionary = {
  es: {
    privacy: "El archivo se lee localmente; la IA solo recibe texto con tu permiso.",
    builderNav: "Crear CV",
    analyzerNav: "Analizar CV",
    eyebrow: "Analizador ATS gratuito",
    title: "Tu CV, revisado con evidencia.",
    intro: "Más de 20 comprobaciones trazables para entender qué puede leer un ATS y qué necesita mejorar un reclutador.",
    badges: ["21 comprobaciones", "100% privado", "Sin registro"],
    landingLead: "Sube tu CV y recibe un informe claro, criterio por criterio. Si añades una vacante, también podrás adaptarlo con IA sin inventar datos.",
    landingPrivacy: "Tu PDF nunca sale de este dispositivo durante el análisis local.",
    previewEyebrow: "Vista del informe",
    previewTitle: "No solo una nota: sabrás por qué.",
    previewProblems: "puntos por revisar",
    previewChecks: ["Lectura ATS", "Secciones", "Contenido y claridad", "Impacto", "Contacto"],
    uploadTitle: "Sube tu CV",
    uploadHelp: "PDF o DOCX con texto seleccionable. Máximo 10 MB.",
    dropTitle: "Arrastra tu CV aquí",
    dropBody: "o selecciónalo desde tu dispositivo",
    choose: "Elegir archivo",
    replace: "Cambiar archivo",
    remove: "Quitar",
    reading: "Leyendo el contenido…",
    ready: "Listo para analizar",
    words: "palabras detectadas",
    vacancyLabel: "¿Ya tienes una oferta? Pega la descripción",
    vacancyHelp: "Calcularemos la compatibilidad y podremos preparar una versión de tu CV adaptada a sus requisitos.",
    vacancyPlaceholder: "Ej. Buscamos analista de datos con experiencia en SQL, Power BI, Python…",
    vacancyReady: "Oferta detectada: revisaremos sus requisitos y podrás obtener compatibilidad semántica con IA.",
    analyze: "Analizar mi CV",
    analyzeAndAdapt: "Analizar CV y oferta",
    reanalyze: "Actualizar análisis",
    reanalyzeAndAdapt: "Actualizar CV y oferta",
    safe: "El análisis rápido se realiza en este dispositivo.",
    analyzing: "Comprobando tu CV…",
    analysisStages: ["Texto extraído", "Secciones clasificadas", "Contenido comprobado", "Informe preparado"],
    reportEyebrow: "Informe local trazable",
    reportTitle: "Cada resultado explica qué encontró.",
    completedChecks: "comprobaciones completadas",
    passedChecks: "correctas",
    reviewChecks: "por revisar",
    evidence: "Evidencia",
    checkStatus: { pass: "Correcto", warning: "Revisar", fail: "Prioritario" },
    beforeEyebrow: "Qué revisaremos",
    beforeTitle: "Una revisión práctica, no una caja negra.",
    checks: [
      ["Lectura ATS", "Comprobamos si el contenido puede extraerse y clasificarse."],
      ["Estructura", "Buscamos contacto, perfil, experiencia, educación y habilidades."],
      ["Impacto", "Detectamos verbos de acción, cifras y logros medibles."],
      ["Coincidencia", "Comparamos tu CV con las palabras clave de una vacante."],
    ],
    disclaimer: "El puntaje es una guía de mejora. Cada empresa configura sus filtros de forma diferente.",
    scoreLabel: "Índice de preparación",
    scoreMethod: "Índice propio de AlineaCV calculado con 21 controles ponderados; no es una calificación emitida por una empresa o un ATS específico.",
    summary: "Resumen del análisis",
    changeTitle: "Cambios recomendados",
    strengthsTitle: "Lo que ya funciona",
    noStrengths: "Completa los cambios prioritarios para construir una base más sólida.",
    suggestion: "Cómo mejorarlo",
    critical: "Prioritario",
    warning: "Mejora",
    keywordTitle: "Vista rápida de requisitos",
    keywordHelp: "Esta detección ocurre en tu dispositivo. La compatibilidad general por contexto aparece en la revisión con IA.",
    matched: "Encontrados en tu CV",
    missing: "No encontrados",
    keywordEmpty: "Añade una descripción de empleo para ver las palabras clave coincidentes y faltantes.",
    keywordUnclear: "No identificamos requisitos concretos. Pega la descripción completa, incluyendo habilidades y herramientas solicitadas.",
    metrics: ["Palabras", "Secciones", "Logros medibles", "Verbos de acción"],
    another: "Analizar otro CV",
    improve: "Abrir creador de CV",
    errors: {
      type: "Usa un archivo PDF o DOCX.",
      size: "El archivo debe pesar menos de 10 MB.",
      empty: "No pudimos extraer suficiente texto. Si es un CV escaneado, expórtalo nuevamente con texto seleccionable.",
      generic: "No pudimos leer este archivo. Prueba exportándolo nuevamente como PDF o DOCX.",
    },
  },
  en: {
    privacy: "The file is read locally; AI only receives text with your permission.",
    builderNav: "Build resume",
    analyzerNav: "Check resume",
    eyebrow: "Free ATS resume checker",
    title: "Your resume, reviewed with evidence.",
    intro: "More than 20 traceable checks to understand what an ATS can read and what a recruiter still needs.",
    badges: ["21 traceable checks", "100% private", "No account"],
    landingLead: "Upload your resume and receive a clear, check-by-check report. Add a job to tailor it with AI without inventing facts.",
    landingPrivacy: "Your PDF never leaves this device during the local analysis.",
    previewEyebrow: "Report preview",
    previewTitle: "Not just a score: you will know why.",
    previewProblems: "items to review",
    previewChecks: ["ATS parsing", "Sections", "Content and clarity", "Impact", "Contact"],
    uploadTitle: "Upload your resume",
    uploadHelp: "Text-based PDF or DOCX. 10 MB maximum.",
    dropTitle: "Drop your resume here",
    dropBody: "or select it from your device",
    choose: "Choose file",
    replace: "Replace file",
    remove: "Remove",
    reading: "Reading content…",
    ready: "Ready to analyze",
    words: "words detected",
    vacancyLabel: "Already have a job offer? Paste the description",
    vacancyHelp: "We will calculate compatibility and can prepare a resume version tailored to its requirements.",
    vacancyPlaceholder: "e.g. We are looking for a data analyst with SQL, Power BI and Python experience…",
    vacancyReady: "Job detected: we will review its requirements and you can get semantic AI compatibility.",
    analyze: "Analyze my resume",
    analyzeAndAdapt: "Analyze resume and job",
    reanalyze: "Update analysis",
    reanalyzeAndAdapt: "Update resume and job",
    safe: "The quick analysis runs on this device.",
    analyzing: "Checking your resume…",
    analysisStages: ["Text extracted", "Sections classified", "Content checked", "Report prepared"],
    reportEyebrow: "Traceable local report",
    reportTitle: "Every result explains what it found.",
    completedChecks: "checks completed",
    passedChecks: "passed",
    reviewChecks: "to review",
    evidence: "Evidence",
    checkStatus: { pass: "Passed", warning: "Review", fail: "Priority" },
    beforeEyebrow: "What we check",
    beforeTitle: "A practical review, not a black box.",
    checks: [
      ["ATS parsing", "We verify whether the content can be extracted and classified."],
      ["Structure", "We look for contact, summary, experience, education and skills."],
      ["Impact", "We detect action verbs, numbers and measurable achievements."],
      ["Job match", "We compare your resume against the keywords in a job description."],
    ],
    disclaimer: "The score is an improvement guide. Every company configures its screening tools differently.",
    scoreLabel: "Readiness index",
    scoreMethod: "AlineaCV's own index, calculated from 21 weighted checks; it is not a score issued by a company or a specific ATS.",
    summary: "Analysis summary",
    changeTitle: "Recommended changes",
    strengthsTitle: "What already works",
    noStrengths: "Complete the priority changes to build a stronger foundation.",
    suggestion: "How to improve it",
    critical: "Priority",
    warning: "Improve",
    keywordTitle: "Quick requirement preview",
    keywordHelp: "This detection runs on your device. The general context-aware compatibility appears in the AI review.",
    matched: "Found in your resume",
    missing: "Not found",
    keywordEmpty: "Add a job description to see matched and missing keywords.",
    keywordUnclear: "We could not identify concrete requirements. Paste the complete description, including requested skills and tools.",
    metrics: ["Words", "Sections", "Measured results", "Action verbs"],
    another: "Check another resume",
    improve: "Open resume builder",
    errors: {
      type: "Use a PDF or DOCX file.",
      size: "The file must be smaller than 10 MB.",
      empty: "We could not extract enough text. If the resume is scanned, export it again with selectable text.",
      generic: "We could not read this file. Try exporting it again as PDF or DOCX.",
    },
  },
} as const;

async function extractPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : "")).join(""));
  }

  return pages.join("\n\n");
}

async function extractDocx(file: File) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

function isSupported(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "pdf" || extension === "docx";
}

export default function AtsAnalyzer() {
  const [language, setLanguage] = useState<Language>("es");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<ReturnType<typeof analyzeResume> | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = dictionary[language];

  async function readFile(nextFile: File) {
    setError("");
    setResult(null);
    setResumeText("");

    if (!isSupported(nextFile)) {
      setFile(null);
      setStatus("error");
      setError(copy.errors.type);
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setFile(null);
      setStatus("error");
      setError(copy.errors.size);
      return;
    }

    setFile(nextFile);
    setStatus("reading");
    try {
      const extension = nextFile.name.split(".").pop()?.toLowerCase();
      const extracted = extension === "pdf" ? await extractPdf(nextFile) : await extractDocx(nextFile);
      const cleaned = extracted.split(String.fromCharCode(0)).join(" ").replace(/[ \t]+/g, " ").trim();
      if (cleaned.split(/\s+/).length < 40) throw new Error("empty");
      setResumeText(cleaned);
      setStatus("ready");
    } catch (readError) {
      setStatus("error");
      setError(readError instanceof Error && readError.message === "empty" ? copy.errors.empty : copy.errors.generic);
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) void readFile(selected);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const selected = event.dataTransfer.files?.[0];
    if (selected) void readFile(selected);
  }

  async function runAnalysis() {
    if (!resumeText) return;
    setStatus("analyzing");
    setScanStage(1);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const nextResult = analyzeResume(resumeText, jobDescription, language);
    setScanStage(copy.analysisStages.length);
    setResult(nextResult);
    setStatus("ready");
  }

  function adaptToJob(description: string) {
    if (!resumeText) return;
    setJobDescription(description);
    setResult(analyzeResume(resumeText, description, language));
    window.setTimeout(() => document.getElementById("ats-ai-improver")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function reset() {
    setFile(null);
    setStatus("idle");
    setResumeText("");
    setResult(null);
    setError("");
    setScanStage(0);
  }

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    if (resumeText && result) setResult(analyzeResume(resumeText, jobDescription, nextLanguage));
  }

  const wordCount = resumeText ? resumeText.split(/\s+/).filter(Boolean).length : 0;
  const hasVacancy = jobDescription.trim().length > 0;
  const analyzeLabel = result
    ? hasVacancy ? copy.reanalyzeAndAdapt : copy.reanalyze
    : hasVacancy ? copy.analyzeAndAdapt : copy.analyze;
  const scoreColor = result && result.score < 50 ? "#e86b64" : result && result.score < 75 ? "#e1a43b" : "#2fc58b";

  return (
    <main className="ats-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="AlineaCV — Inicio">
          <span className="brand-mark">A</span>
          <span>Alinea<span>CV</span></span>
        </a>
        <div className="header-actions">
          <HeaderNavigation active="analyzer" language={language} />
          <span className="privacy-note"><span>✓</span>{copy.privacy}</span>
          <div className="language-switcher" aria-label="Idioma / Language">
            <button type="button" className={language === "es" ? "active" : ""} onClick={() => changeLanguage("es")} aria-pressed={language === "es"}>ES</button>
            <button type="button" className={language === "en" ? "active" : ""} onClick={() => changeLanguage("en")} aria-pressed={language === "en"}>EN</button>
          </div>
        </div>
      </header>

      <input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onInputChange} />

      {!file ? (
        <section className="ats-landing" aria-label={copy.eyebrow}>
          <div className="ats-landing-copy">
            <p>{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <span>{copy.intro}</span>
            <strong>{copy.landingLead}</strong>
            <div
              className={`ats-landing-dropzone ${dragging ? "dragging" : ""}`}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <span className="ats-file-icon" aria-hidden="true">CV</span>
              <div><b>{copy.dropTitle}</b><small>{copy.uploadHelp}</small></div>
              <button type="button" onClick={() => inputRef.current?.click()}>{copy.choose}</button>
            </div>
            <small className="ats-landing-privacy"><span>✓</span>{copy.landingPrivacy}</small>
            {error && <p className="ats-landing-error" role="alert">{error}</p>}
            <div className="ats-badges" aria-label={language === "es" ? "Características" : "Features"}>
              {copy.badges.map((badge) => <span key={badge}>✓ {badge}</span>)}
            </div>
          </div>

          <div className="ats-report-preview" aria-hidden="true">
            <div className="ats-preview-score">
              <span>{copy.scoreLabel}</span>
              <div><strong>78</strong><small>/100</small></div>
              <p>5 {copy.previewProblems}</p>
            </div>
            <div className="ats-preview-report">
              <p>{copy.previewEyebrow}</p>
              <h2>{copy.previewTitle}</h2>
              <div>
                {copy.previewChecks.map((label, index) => (
                  <article key={label}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><strong>{label}</strong><i><b style={{ width: `${[88, 78, 64, 70, 100][index]}%` }} /></i></div>
                    <em>{[88, 78, 64, 70, 100][index]}%</em>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="ats-hero ats-hero-compact">
            <div><p>{copy.eyebrow}</p><h1>{copy.title}</h1><span>{copy.intro}</span></div>
            <div className="ats-badges" aria-label={language === "es" ? "Características" : "Features"}>
              {copy.badges.map((badge) => <span key={badge}>✓ {badge}</span>)}
            </div>
          </section>

          <section className="ats-workspace" aria-label={copy.eyebrow}>
            <aside className="ats-input-panel">
              <div className="ats-panel-heading">
                <span>01</span>
                <div><h2>{copy.uploadTitle}</h2><p>{copy.uploadHelp}</p></div>
              </div>

              <div className="ats-file-card" aria-live="polite">
                <span>{file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX"}</span>
                <div>
                  <strong>{file.name}</strong>
                  <p>{status === "reading" ? copy.reading : `${copy.ready} · ${wordCount} ${copy.words}`}</p>
                </div>
                <button type="button" onClick={reset} aria-label={copy.remove}>×</button>
              </div>
              {error && <p className="ats-error" role="alert">{error}</p>}

              <label className="ats-job-field">
                <span>{copy.vacancyLabel}</span>
                <small>{copy.vacancyHelp}</small>
                <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder={copy.vacancyPlaceholder} rows={8} />
                {hasVacancy && <i className="ats-job-ready">✓ {copy.vacancyReady}</i>}
              </label>

              <button type="button" className="ats-primary-button" disabled={status !== "ready"} onClick={() => void runAnalysis()}>
                {status === "analyzing" ? copy.analyzing : analyzeLabel} <span>→</span>
              </button>
              <p className="ats-local-note"><span>✓</span>{copy.safe}</p>
            </aside>

            <section className="ats-results-panel" aria-live="polite">
              {status === "analyzing" ? (
                <div className="ats-analysis-progress">
                  <span className="ats-progress-spinner" />
                  <p>{copy.analyzing}</p>
                  <div>{copy.analysisStages.map((stage, index) => <span className={index < scanStage ? "complete" : ""} key={stage}>{index < scanStage ? "✓" : "·"} {stage}</span>)}</div>
                </div>
              ) : !result ? (
                <div className="ats-empty-results">
                  <p>{copy.beforeEyebrow}</p>
                  <h2>{copy.beforeTitle}</h2>
                  <div className="ats-check-list">
                    {copy.checks.map(([title, description], index) => (
                      <article key={title}>
                        <span>0{index + 1}</span>
                        <div><h3>{title}</h3><p>{description}</p></div>
                      </article>
                    ))}
                  </div>
                  <small>{copy.disclaimer}</small>
                </div>
              ) : (
                <div className="ats-results">
                  <div className="ats-report-layout">
                    <aside className="ats-report-sidebar">
                      <p>{copy.scoreLabel}</p>
                      <div className="ats-score-ring" style={{ background: `conic-gradient(${scoreColor} ${result.score * 3.6}deg, #dce6ec 0deg)` }}>
                        <div><strong>{result.score}</strong><span>/100</span></div>
                      </div>
                      <h2>{result.verdict}</h2>
                      <span>{result.metrics.checkCount} {copy.completedChecks}</span>
                      <small className="ats-score-method">{copy.scoreMethod}</small>
                      <nav aria-label={copy.summary}>
                        {result.auditGroups.map((group) => (
                          <a className={group.score >= 75 ? "good" : group.score >= 50 ? "review" : "priority"} href={`#audit-${group.id}`} key={group.id}>
                            <span>{group.label}<small>{group.issueCount} {copy.reviewChecks}</small></span>
                            <strong>{group.score}%</strong>
                          </a>
                        ))}
                      </nav>
                    </aside>

                    <div className="ats-report-content">
                      <header className="ats-report-heading">
                        <div><p>{copy.reportEyebrow}</p><h2>{copy.reportTitle}</h2></div>
                        <div><span>✓ {result.metrics.passedCount} {copy.passedChecks}</span><span>{result.metrics.checkCount - result.metrics.passedCount} {copy.reviewChecks}</span></div>
                      </header>

                      <div className="ats-metrics">
                        {[result.metrics.wordCount, result.metrics.sectionCount, result.metrics.metricCount, result.metrics.actionCount].map((value, index) => (
                          <div key={copy.metrics[index]}><strong>{value}</strong><span>{copy.metrics[index]}</span></div>
                        ))}
                      </div>

                      <section className="ats-audit-groups" aria-label={copy.summary}>
                        {result.auditGroups.map((group, groupIndex) => (
                          <details className={group.score >= 75 ? "good" : group.score >= 50 ? "review" : "priority"} id={`audit-${group.id}`} open={groupIndex === 0} key={group.id}>
                            <summary><span><b>{group.label}</b><small>{group.checks.length} {copy.completedChecks} · {group.issueCount} {copy.reviewChecks}</small></span><strong>{group.score}%</strong></summary>
                            <div className="ats-audit-checks">
                              {group.checks.map((audit) => (
                                <article className={audit.status} key={audit.id}>
                                  <span>{audit.status === "pass" ? "✓" : audit.status === "warning" ? "!" : "×"}</span>
                                  <div>
                                    <header><h3>{audit.title}</h3><b>{copy.checkStatus[audit.status as keyof typeof copy.checkStatus]}</b></header>
                                    <small>{copy.evidence}</small>
                                    <p>{audit.evidence}</p>
                                    {audit.status !== "pass" && <em>{audit.recommendation}</em>}
                                  </div>
                                </article>
                              ))}
                            </div>
                          </details>
                        ))}
                      </section>

                      <section className="ats-keyword-section">
                        <div className="ats-section-title"><h3>{copy.keywordTitle}</h3></div>
                        {result.keywordMatch ? (
                          <>
                            <div className="ats-keyword-columns">
                              <div><span>{copy.matched}</span><div>{result.keywordMatch.matched.map((keyword) => <i className="matched" key={keyword}>{keyword}</i>)}</div></div>
                              <div><span>{copy.missing}</span><div>{result.keywordMatch.missing.map((keyword) => <i className="missing" key={keyword}>{keyword}</i>)}</div></div>
                            </div>
                            <small className="ats-keyword-note">{copy.keywordHelp}</small>
                          </>
                        ) : <p>{hasVacancy ? copy.keywordUnclear : copy.keywordEmpty}</p>}
                      </section>

                      <section className="ats-strengths-section">
                        <h3>{copy.strengthsTitle}</h3>
                        {result.strengths.length ? <ul>{result.strengths.map((strength) => <li key={strength}>✓ {strength}</li>)}</ul> : <p>{copy.noStrengths}</p>}
                      </section>
                    </div>
                  </div>

                  <AiImprover
                    key={`${jobDescription.length}-${jobDescription.slice(0, 120)}-${jobDescription.slice(-120)}`}
                    resumeText={resumeText}
                    jobDescription={jobDescription}
                    language={language}
                    onAdapt={adaptToJob}
                  />

                  <div className="ats-result-actions">
                    <button type="button" onClick={reset}>{copy.another}</button>
                    <a href="/">{copy.improve} →</a>
                  </div>
                  <small className="ats-disclaimer">{copy.disclaimer}</small>
                </div>
              )}
            </section>
          </section>
        </>
      )}
    </main>
  );
}
