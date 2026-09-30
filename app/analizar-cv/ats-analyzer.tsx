"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Native anchors avoid vinext beta client-navigation failures in production. */

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { analyzeResume } from "./analysis.mjs";
import { adaptedVersionName } from "./adapted-resume.mjs";
import AtsReport from "./ats-report";
import { extractPdfOperatorItems, extractPdfPageText } from "./pdf-text-extraction.mjs";
import { repairWrappedResumeLines } from "./resume-improvements.mjs";

type Language = "es" | "en";
type Status = "idle" | "reading" | "loading-job" | "analyzing" | "ready" | "error";
const dictionary = {
  es: {
    privacy: "Tu CV y la vacante se analizan en este dispositivo.",
    builderNav: "Crear CV",
    analyzerNav: "Analizar CV",
    eyebrow: "Analizador ATS gratuito",
    title: "Acerca tu CV al puesto que buscas.",
    intro: "Sube tu CV y añade la oferta. Recibe una versión adaptada y lista para postular.",
    badges: ["PDF y Word", "Análisis en tu dispositivo", "Sin registro"],
    landingLead: "Sube tu CV y pega la descripción de la vacante. Revisaremos sus coincidencias y la calidad del documento, criterio por criterio.",
    landingPrivacy: "Tu PDF nunca sale de este dispositivo durante el análisis local.",
    previewEyebrow: "Vista del informe",
    previewTitle: "No solo una nota: sabrás por qué.",
    previewProblems: "puntos por revisar",
    previewPending: "CV + vacante",
    vacancyRequired: "Añade la descripción de la vacante para analizar.",
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
    vacancyLabel: "Pega la descripción",
    vacancyHelp: "Incluye las funciones y los requisitos del puesto.",
    vacancyPlaceholder: "Ej. Buscamos analista de datos con experiencia en SQL, Power BI, Python…",
    vacancyUrlLabel: "Usa el enlace de la oferta",
    vacancyUrlHelp: "Leeremos la publicación para completar el análisis.",
    vacancyUrlPlaceholder: "https://empresa.com/empleos/vacante",
    vacancyUrlLoading: "Leyendo la oferta…",
    vacancyReady: "Vacante añadida: ya podemos comparar sus palabras clave con tu CV.",
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
    scoreLabel: "Coincidencia con la vacante",
    scoreLabelJob: "Coincidencia de palabras clave",
    scoreMethod: "No identificamos requisitos concretos en esta descripción. Amplíala para calcular la coincidencia; las comprobaciones del documento siguen disponibles.",
    scoreMethodJob: "Porcentaje de palabras clave detectadas en la vacante que también aparecen en tu CV. No evalúa todos los requisitos, niveles ni años de experiencia, y no predice si pasarás un ATS. La calidad del documento se revisa por separado.",
    summary: "Resumen del análisis",
    changeTitle: "Cambios recomendados",
    strengthsTitle: "Lo que ya funciona",
    noStrengths: "Completa los cambios prioritarios para construir una base más sólida.",
    suggestion: "Cómo mejorarlo",
    critical: "Prioritario",
    warning: "Mejora",
    keywordTitle: "Vista rápida de requisitos",
    keywordHelp: "Esta comparación busca términos y equivalencias conocidas en tu dispositivo. Encontrar una palabra no demuestra por sí solo que cumples el requisito.",
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
      jobUrl: "No pudimos leer ese enlace. Pega la descripción de la oferta para continuar.",
    },
  },
  en: {
    privacy: "Your resume and job description are analyzed on this device.",
    builderNav: "Build resume",
    analyzerNav: "Check resume",
    eyebrow: "Free ATS resume checker",
    title: "Bring your resume closer to your next role.",
    intro: "Upload your resume and add the job description. Get a tailored version ready to apply.",
    badges: ["PDF and Word", "On-device analysis", "No account"],
    landingLead: "Upload your resume and paste the job description. We will review keyword matches and document quality, check by check.",
    landingPrivacy: "Your PDF never leaves this device during the local analysis.",
    previewEyebrow: "Report preview",
    previewTitle: "Not just a score: you will know why.",
    previewProblems: "items to review",
    previewPending: "Resume + job",
    vacancyRequired: "Add the job description to run the analysis.",
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
    vacancyLabel: "Paste the job description",
    vacancyHelp: "Include the role's responsibilities and requirements.",
    vacancyPlaceholder: "e.g. We are looking for a data analyst with SQL, Power BI and Python experience…",
    vacancyUrlLabel: "Use the job posting link",
    vacancyUrlHelp: "We will read the posting to complete the analysis.",
    vacancyUrlPlaceholder: "https://company.com/jobs/opening",
    vacancyUrlLoading: "Reading the job posting…",
    vacancyReady: "Job description added: we can now compare its keywords with your resume.",
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
    scoreLabel: "Match against the job",
    scoreLabelJob: "Keyword match",
    scoreMethod: "We could not identify concrete requirements in this description. Add detail to calculate the match; document checks remain available.",
    scoreMethodJob: "Percentage of detected job keywords also found in your resume. It does not assess every requirement, proficiency level or year of experience, and does not predict passing an ATS. Document quality is reviewed separately.",
    summary: "Analysis summary",
    changeTitle: "Recommended changes",
    strengthsTitle: "What already works",
    noStrengths: "Complete the priority changes to build a stronger foundation.",
    suggestion: "How to improve it",
    critical: "Priority",
    warning: "Improve",
    keywordTitle: "Quick requirement preview",
    keywordHelp: "This comparison looks for terms and known equivalents on your device. Finding a word alone does not prove that you meet the requirement.",
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
      jobUrl: "We could not read that link. Paste the job description to continue.",
    },
  },
} as const;

async function extractPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const document = await loadingTask.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });
      const operatorList = await page.getOperatorList();
      const operatorItems = extractPdfOperatorItems(operatorList, pdfjs.OPS, viewport.width, viewport.height);
      pages.push(extractPdfPageText(content.items, viewport.width, operatorItems));
    }
    return pages.join("\n\n");
  } finally {
    await loadingTask.destroy();
  }
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

function vacancyLabel(description: string, language: Language) {
  const lines = description.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const labeledLine = lines.find((line) => /^(puesto|cargo|posición|position|role|job title)\s*:/i.test(line));
  const explicitTitle = labeledLine?.replace(/^[^:]+:\s*/, "").trim();
  const searchedTitle = description.match(/\b(?:buscamos|se busca|we are looking for)\s+(?:(?:un|una|a|an)\s+)?([^.,;\n]{3,70})/i)?.[1]?.trim();
  const firstLine = lines[0]?.length <= 70 && !/^(?:[-•*]\s*)?(?:descripción|description|sobre |about |requisitos|requirements|funciones|responsibilities|experiencia|dominio|conocimientos?|manejo|capacidad|disponibilidad)\b/i.test(lines[0]) ? lines[0].replace(/^(?:[-•*]\s*)/, "") : "";
  return explicitTitle || searchedTitle || firstLine || (language === "es" ? "Vacante analizada" : "Analyzed job");
}

function vacancyCompany(description: string) {
  const lines = description.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const labeledLine = lines.find((line) => /^(empresa|compañía|organización|company|organization)\s*:/i.test(line));
  return labeledLine?.replace(/^[^:]+:\s*/, "").trim() ?? "";
}

export default function AtsAnalyzer() {
  const [language, setLanguage] = useState<Language>("es");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const readVersion = useRef(0);
  const targetText = jobDescription;
  const [result, setResult] = useState<ReturnType<typeof analyzeResume> | null>(null);
  const [error, setError] = useState("");
  const [jobError, setJobError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = dictionary[language];

  async function readFile(nextFile: File) {
    const version = ++readVersion.current;
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
      if (version !== readVersion.current) return;
      const cleaned = repairWrappedResumeLines(extracted.split(String.fromCharCode(0)).join(" ").replace(/[ \t]+/g, " ").trim());
      if (cleaned.split(/\s+/).length < 40) throw new Error("empty");
      setResumeText(cleaned);
      setStatus("ready");
    } catch (readError) {
      if (version !== readVersion.current) return;
      setFile(null);
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
    if (status !== "ready" || !resumeText) return;
    const version = readVersion.current;
    let description = targetText.trim();
    setJobError("");
    if (!description && jobUrl.trim()) {
      setStatus("loading-job");
      try {
        const response = await fetch("/api/job-description", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: jobUrl.trim() }),
        });
        const payload = await response.json() as { description?: string };
        if (!response.ok || !payload.description?.trim()) throw new Error("unavailable");
        if (version !== readVersion.current) return;
        description = payload.description.trim();
        setJobDescription(description);
      } catch {
        if (version !== readVersion.current) return;
        setStatus("ready");
        setJobError(copy.errors.jobUrl);
        return;
      }
    }
    if (!description) return;
    setStatus("analyzing");
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (version !== readVersion.current) return;
    const nextResult = analyzeResume(resumeText, description, language, "vacancy");
    setResult(nextResult);
    setStatus("ready");
  }

  function updateVacancy(description: string) {
    setJobDescription(description);
    setJobError("");
    setResult(null);
  }

  function reset() {
    readVersion.current += 1;
    setFile(null);
    setStatus("idle");
    setResumeText("");
    setResult(null);
    setError("");
    setJobError("");
  }

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    if (resumeText && result) {
      setResult(analyzeResume(resumeText, targetText, nextLanguage, "vacancy"));
    }
  }

  const wordCount = resumeText ? resumeText.split(/\s+/).filter(Boolean).length : 0;
  const es = language === "es";
  const hasTarget = targetText.trim().length > 0 || jobUrl.trim().length > 0;
  const targetLabel = vacancyLabel(jobDescription, language);
  const versionName = adaptedVersionName(targetLabel, vacancyCompany(jobDescription), language);

  useEffect(() => {
    if (!result) return;
    const report = document.getElementById("ats-result-summary");
    report?.focus({ preventScroll: true });
    report?.scrollIntoView({ block: "start" });
  }, [result]);


  return (
    <main className="ats-page ats-single-page" lang={language}>
      <header className="site-header">
        <a className="brand" href="/" aria-label="AlineaCV — Inicio">
          <span className="brand-mark">A</span><span>Alinea<span>CV</span></span>
        </a>
        <div className="header-actions">
          <span className="privacy-note"><span>✓</span>{es ? "Tu CV se queda contigo" : "Your resume stays with you"}</span>
          <div className="language-switcher" aria-label="Idioma / Language">
            <button type="button" disabled={status === "analyzing"} className={es ? "active" : ""} onClick={() => changeLanguage("es")} aria-pressed={es}>ES</button>
            <button type="button" disabled={status === "analyzing"} className={!es ? "active" : ""} onClick={() => changeLanguage("en")} aria-pressed={!es}>EN</button>
          </div>
        </div>
      </header>

      {!result ? <section className="ats-focus-landing" aria-labelledby="landing-title">
        <div className="ats-focus-intro">
          <p className="ats-focus-eyebrow">{copy.eyebrow}</p>
          <h1 id="landing-title">{copy.title}</h1>
          <p className="ats-focus-lead">{copy.intro}</p>
          <ul className="ats-focus-benefits">
            <li><span>01</span><div><strong>{es ? "Qué coincide con la oferta" : "What matches the job"}</strong><p>{es ? "Palabras clave presentes y requisitos que conviene revisar." : "Keywords already present and requirements to review."}</p></div></li>
            <li><span>02</span><div><strong>{es ? "Contenido adaptado" : "Tailored content"}</strong><p>{es ? "Priorizamos el perfil, la experiencia y las habilidades relevantes para esa oferta." : "We prioritize the summary, experience and skills relevant to that job."}</p></div></li>
            <li><span>03</span><div><strong>{es ? "Un CV completo para postular" : "A complete resume ready to apply"}</strong><p>{es ? "Descarga una versión ATS que conserva tu trayectoria y prioriza la evidencia relevante para la oferta." : "Download an ATS version that preserves your background and prioritizes evidence relevant to the role."}</p></div></li>
          </ul>
          <p className="ats-focus-limits">{es ? "ATS es el sistema que algunas empresas usan para procesar CV. Esta revisión te orienta; no garantiza superar sus filtros." : "An ATS is a system some companies use to process resumes. This review offers guidance; it does not guarantee passing their filters."}</p>
        </div>

        <form className="ats-focus-form" onSubmit={(event) => { event.preventDefault(); void runAnalysis(); }} aria-busy={status === "reading" || status === "loading-job" || status === "analyzing"}>
          <div className="ats-focus-step"><span>1</span><h2>{copy.uploadTitle}</h2></div>
          <input ref={inputRef} className="visually-hidden" type="file" aria-label={copy.choose} tabIndex={-1} accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onInputChange} />
          {!file ? <div className={`ats-focus-dropzone ${dragging ? "dragging" : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
            <strong>{copy.dropTitle}</strong><p>{copy.uploadHelp}</p>
            <button type="button" onClick={() => inputRef.current?.click()}>{copy.choose}<span aria-hidden="true"> ↑</span></button>
          </div> : <div className="ats-focus-file" role="status">
            <span className="ats-focus-file-type">{file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX"}</span>
            <div><strong>{file.name}</strong><p>{status === "reading" ? copy.reading : `${wordCount} ${copy.words}`}</p></div>
            <button type="button" onClick={reset} aria-label={copy.remove}>×</button>
          </div>}
          {error && <p className="ats-focus-error" role="alert">{error}</p>}
          <fieldset className="ats-focus-target" disabled={status === "loading-job" || status === "analyzing"}>
            <legend className="ats-focus-step"><span>2</span>{es ? "Cuéntanos a qué postulas" : "Tell us what you are applying for"}</legend>
            <div className="ats-target-fields">
              <div className="ats-target-description">
                <label className="ats-target-label" htmlFor="ats-target">{copy.vacancyLabel}</label>
                <textarea id="ats-target" maxLength={18_000} value={jobDescription} onChange={(event) => updateVacancy(event.target.value)} placeholder={copy.vacancyPlaceholder} rows={7} aria-describedby="ats-target-help" />
                <p id="ats-target-help">{copy.vacancyHelp}</p>
              </div>
              <div className="ats-target-divider"><span>{es ? "o" : "or"}</span></div>
              <div className="ats-target-url">
                <label className="ats-target-label" htmlFor="ats-job-url">{copy.vacancyUrlLabel}</label>
                <input id="ats-job-url" type="url" maxLength={2_000} value={jobUrl} onChange={(event) => { setJobUrl(event.target.value); setJobError(""); setResult(null); }} placeholder={copy.vacancyUrlPlaceholder} aria-describedby="ats-job-url-help" />
                <p id="ats-job-url-help">{copy.vacancyUrlHelp}</p>
              </div>
            </div>
            {jobError && <p className="ats-focus-error ats-target-error" role="alert">{jobError}</p>}
          </fieldset>
          <button type="submit" className="ats-focus-submit" disabled={status !== "ready" || !hasTarget}>{status === "loading-job" ? copy.vacancyUrlLoading : status === "analyzing" ? copy.analyzing : copy.analyze}<span aria-hidden="true">→</span></button>
        </form>
      </section> : <section className="ats-workspace has-report" aria-label={es ? "Resultado del análisis" : "Analysis results"}>
        <AtsReport key={language + targetText} result={result} resumeText={resumeText} jobDescription={jobDescription} fileName={file?.name || (es ? "CV analizado" : "Analyzed resume")} targetLabel={targetLabel} versionName={versionName} language={language} onReset={reset} onEdit={() => setResult(null)} />
      </section>}
      <footer className="ats-focus-footer"><span>AlineaCV</span><p>{es ? "Mejora cómo presentas tu experiencia. Conserva lo que te hace único." : "Improve how you present your experience. Keep what makes you unique."}</p></footer>
    </main>
  );
}
