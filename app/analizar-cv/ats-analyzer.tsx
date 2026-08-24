"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { analyzeResume } from "./analysis.mjs";
import AiImprover from "./ai-improver";

type Language = "es" | "en";
type Status = "idle" | "reading" | "ready" | "error";

const dictionary = {
  es: {
    privacy: "El archivo se lee localmente; la IA solo recibe texto con tu permiso.",
    builderNav: "Crear CV",
    analyzerNav: "Analizar CV",
    eyebrow: "Analizador ATS gratuito",
    title: "Descubre qué está frenando tu CV.",
    intro: "Sube tu currículum, detecta problemas de lectura ATS y compáralo con la descripción del empleo que buscas.",
    badges: ["100% privado", "PDF y DOCX", "Sin registro"],
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
    vacancyLabel: "Descripción de la vacante (opcional)",
    vacancyHelp: "Pega aquí las responsabilidades y requisitos para medir coincidencia de palabras clave.",
    vacancyPlaceholder: "Ej. Buscamos analista de datos con experiencia en SQL, Power BI, Python…",
    analyze: "Analizar mi CV",
    reanalyze: "Actualizar análisis",
    safe: "El análisis rápido se realiza en este dispositivo.",
    beforeEyebrow: "Qué revisaremos",
    beforeTitle: "Una revisión práctica, no una caja negra.",
    checks: [
      ["Lectura ATS", "Comprobamos si el contenido puede extraerse y clasificarse."],
      ["Estructura", "Buscamos contacto, perfil, experiencia, educación y habilidades."],
      ["Impacto", "Detectamos verbos de acción, cifras y logros medibles."],
      ["Coincidencia", "Comparamos tu CV con las palabras clave de una vacante."],
    ],
    disclaimer: "El puntaje es una guía de mejora. Cada empresa configura sus filtros de forma diferente.",
    scoreLabel: "Puntaje ATS",
    summary: "Resumen del análisis",
    changeTitle: "Cambios recomendados",
    strengthsTitle: "Lo que ya funciona",
    noStrengths: "Completa los cambios prioritarios para construir una base más sólida.",
    suggestion: "Cómo mejorarlo",
    critical: "Prioritario",
    warning: "Mejora",
    keywordTitle: "Coincidencia con la vacante",
    matched: "Coinciden",
    missing: "Faltan",
    keywordEmpty: "Añade una descripción de empleo para ver las palabras clave coincidentes y faltantes.",
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
    title: "Find out what is holding your resume back.",
    intro: "Upload your resume, detect ATS readability issues and compare it with the job description you are targeting.",
    badges: ["100% private", "PDF and DOCX", "No account"],
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
    vacancyLabel: "Job description (optional)",
    vacancyHelp: "Paste the responsibilities and requirements to measure keyword coverage.",
    vacancyPlaceholder: "e.g. We are looking for a data analyst with SQL, Power BI and Python experience…",
    analyze: "Analyze my resume",
    reanalyze: "Update analysis",
    safe: "The quick analysis runs on this device.",
    beforeEyebrow: "What we check",
    beforeTitle: "A practical review, not a black box.",
    checks: [
      ["ATS parsing", "We verify whether the content can be extracted and classified."],
      ["Structure", "We look for contact, summary, experience, education and skills."],
      ["Impact", "We detect action verbs, numbers and measurable achievements."],
      ["Job match", "We compare your resume against the keywords in a job description."],
    ],
    disclaimer: "The score is an improvement guide. Every company configures its screening tools differently.",
    scoreLabel: "ATS score",
    summary: "Analysis summary",
    changeTitle: "Recommended changes",
    strengthsTitle: "What already works",
    noStrengths: "Complete the priority changes to build a stronger foundation.",
    suggestion: "How to improve it",
    critical: "Priority",
    warning: "Improve",
    keywordTitle: "Job description match",
    matched: "Matched",
    missing: "Missing",
    keywordEmpty: "Add a job description to see matched and missing keywords.",
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
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = dictionary[language];

  async function readFile(nextFile: File) {
    setError("");
    setResult(null);
    setResumeText("");

    if (!isSupported(nextFile)) {
      setStatus("error");
      setError(copy.errors.type);
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
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

  function runAnalysis() {
    if (!resumeText) return;
    setResult(analyzeResume(resumeText, jobDescription, language));
  }

  function reset() {
    setFile(null);
    setStatus("idle");
    setResumeText("");
    setResult(null);
    setError("");
  }

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    if (resumeText && result) setResult(analyzeResume(resumeText, jobDescription, nextLanguage));
  }

  const wordCount = resumeText ? resumeText.split(/\s+/).filter(Boolean).length : 0;

  return (
    <main className="ats-page">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="AlineaCV — Inicio">
          <span className="brand-mark">A</span>
          <span>Alinea<span>CV</span></span>
        </Link>
        <div className="header-actions">
          <nav className="header-nav" aria-label={language === "es" ? "Herramientas" : "Tools"}>
            <Link href="/">{copy.builderNav}</Link>
            <Link className="active" href="/analizar-cv">{copy.analyzerNav}</Link>
          </nav>
          <span className="privacy-note"><span>✓</span>{copy.privacy}</span>
          <div className="language-switcher" aria-label="Idioma / Language">
            <button type="button" className={language === "es" ? "active" : ""} onClick={() => changeLanguage("es")} aria-pressed={language === "es"}>ES</button>
            <button type="button" className={language === "en" ? "active" : ""} onClick={() => changeLanguage("en")} aria-pressed={language === "en"}>EN</button>
          </div>
        </div>
      </header>

      <section className="ats-hero">
        <div>
          <p>{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <span>{copy.intro}</span>
        </div>
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

          {!file || status === "error" ? (
            <div
              className={`ats-dropzone ${dragging ? "dragging" : ""}`}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <span className="ats-file-icon" aria-hidden="true">CV</span>
              <strong>{copy.dropTitle}</strong>
              <p>{copy.dropBody}</p>
              <button type="button" className="ats-secondary-button" onClick={() => inputRef.current?.click()}>{copy.choose}</button>
            </div>
          ) : (
            <div className="ats-file-card" aria-live="polite">
              <span>{file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX"}</span>
              <div>
                <strong>{file.name}</strong>
                <p>{status === "reading" ? copy.reading : `${copy.ready} · ${wordCount} ${copy.words}`}</p>
              </div>
              <button type="button" onClick={reset} aria-label={copy.remove}>×</button>
            </div>
          )}

          <input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onInputChange} />
          {error && <p className="ats-error" role="alert">{error}</p>}

          <label className="ats-job-field">
            <span>{copy.vacancyLabel}</span>
            <small>{copy.vacancyHelp}</small>
            <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder={copy.vacancyPlaceholder} rows={8} />
          </label>

          <button type="button" className="ats-primary-button" disabled={status !== "ready"} onClick={runAnalysis}>
            {result ? copy.reanalyze : copy.analyze} <span>→</span>
          </button>
          <p className="ats-local-note"><span>✓</span>{copy.safe}</p>
        </aside>

        <section className="ats-results-panel" aria-live="polite">
          {!result ? (
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
              <div className="ats-score-summary">
                <div className="ats-score-ring" style={{ background: `conic-gradient(#41d69a ${result.score * 3.6}deg, #dce6ec 0deg)` }}>
                  <div><strong>{result.score}</strong><span>/100</span></div>
                </div>
                <div><p>{copy.scoreLabel}</p><h2>{result.verdict}</h2><span>{result.issues.length} {language === "es" ? "oportunidades detectadas" : "opportunities found"}</span></div>
              </div>

              <div className="ats-metrics">
                {[result.metrics.wordCount, result.metrics.sectionCount, result.metrics.metricCount, result.metrics.actionCount].map((value, index) => (
                  <div key={copy.metrics[index]}><strong>{value}</strong><span>{copy.metrics[index]}</span></div>
                ))}
              </div>

              <section className="ats-category-section">
                <h3>{copy.summary}</h3>
                <div className="ats-category-list">
                  {result.categories.map((category) => (
                    <div key={category.label}>
                      <span>{category.label}</span>
                      <div><i style={{ width: `${(category.score / category.maximum) * 100}%` }} /></div>
                      <strong>{category.score}/{category.maximum}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ats-keyword-section">
                <div className="ats-section-title"><h3>{copy.keywordTitle}</h3>{result.keywordMatch && <strong>{result.keywordMatch.score}%</strong>}</div>
                {result.keywordMatch ? (
                  <div className="ats-keyword-columns">
                    <div><span>{copy.matched}</span><div>{result.keywordMatch.matched.map((keyword) => <i className="matched" key={keyword}>{keyword}</i>)}</div></div>
                    <div><span>{copy.missing}</span><div>{result.keywordMatch.missing.map((keyword) => <i className="missing" key={keyword}>{keyword}</i>)}</div></div>
                  </div>
                ) : <p>{copy.keywordEmpty}</p>}
              </section>

              <section className="ats-issues-section">
                <h3>{copy.changeTitle}</h3>
                <div className="ats-issue-list">
                  {result.issues.map((item) => (
                    <article className={item.severity} key={item.id}>
                      <div><span>{item.severity === "critical" ? copy.critical : copy.warning}</span><h4>{item.title}</h4></div>
                      <p>{item.detail}</p>
                      <strong>{copy.suggestion}</strong>
                      <p>{item.suggestion}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="ats-strengths-section">
                <h3>{copy.strengthsTitle}</h3>
                {result.strengths.length ? <ul>{result.strengths.map((strength) => <li key={strength}>✓ {strength}</li>)}</ul> : <p>{copy.noStrengths}</p>}
              </section>

              <AiImprover resumeText={resumeText} jobDescription={jobDescription} language={language} />

              <div className="ats-result-actions">
                <button type="button" onClick={reset}>{copy.another}</button>
                <Link href="/">{copy.improve} →</Link>
              </div>
              <small className="ats-disclaimer">{copy.disclaimer}</small>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
