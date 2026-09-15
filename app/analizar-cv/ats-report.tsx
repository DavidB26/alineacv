"use client";

import { analyzeResume } from "./analysis.mjs";
import ResumeImprovementPlan from "./resume-improvement-plan";

const dictionary = {
  es: {
    score: "Coincidencia de palabras clave",
    estimate: "Estimación por palabras clave; no garantiza selección.",
    unavailable: "Sin puntaje calculable",
    unavailableHelp: "No identificamos requisitos concretos. Pega una descripción más completa.",
    technical: "Ver detalle técnico ATS",
    method: "El porcentaje refleja cuántas palabras clave detectadas en la vacante aparecen también en el CV. No verifica todos los requisitos, niveles ni años de experiencia. La calidad del documento se revisa por separado.",
    checks: "comprobaciones",
    review: "por revisar",
    evidence: "Evidencia",
    status: { pass: "Correcto", warning: "Revisar", fail: "Prioritario" },
    keywords: "Palabras clave de la vacante",
    matched: "Encontradas",
    missing: "No encontradas",
    none: "Ninguna",
    scoreGuide: "Referencia del analizador",
    scoreRanges: ["0–49 Baja", "50–79 Parcial", "80–100 Alta"],
    strengths: "Lo que ya funciona",
    edit: "Cambiar vacante",
    another: "Analizar otro CV",
    builder: "Abrir creador de CV",
  },
  en: {
    score: "Keyword match",
    estimate: "Keyword-based estimate; selection is not guaranteed.",
    unavailable: "No measurable score",
    unavailableHelp: "No concrete requirements were identified. Paste a fuller description.",
    technical: "View technical ATS details",
    method: "The percentage reflects how many detected job keywords also appear in the resume. It does not verify every requirement, proficiency level or year of experience. Document quality is reviewed separately.",
    checks: "checks",
    review: "to review",
    evidence: "Evidence",
    status: { pass: "Passed", warning: "Review", fail: "Priority" },
    keywords: "Job keywords",
    matched: "Found",
    missing: "Not found",
    none: "None",
    scoreGuide: "Analyzer reference",
    scoreRanges: ["0–49 Low", "50–79 Partial", "80–100 High"],
    strengths: "What already works",
    edit: "Change job description",
    another: "Check another resume",
    builder: "Open resume builder",
  },
} as const;

export default function AtsReport({ result, resumeText, fileName, targetLabel, language, onReset, onEdit }: {
  result: ReturnType<typeof analyzeResume>;
  resumeText: string;
  fileName: string;
  targetLabel: string;
  language: "es" | "en";
  onReset: () => void;
  onEdit: () => void;
}) {
  const copy = dictionary[language];
  const es = language === "es";
  const roleOnly = result.targetMode === "role";
  const scoreState = result.score === null ? "unknown" : result.score >= 80 ? "good" : result.score >= 50 ? "review" : "priority";
  return (
    <div className="ats-results ats-compact-report" id="ats-result-summary" tabIndex={-1}>
      <p className="ats-report-context" aria-label={es ? "Contexto analizado" : "Analyzed context"}>
        <span>{fileName}</span><i aria-hidden="true">·</i><strong>{targetLabel}</strong>
      </p>
      <div className="ats-answer-grid">
        <div className="ats-evidence-column">
          <section className={`ats-match-card ${scoreState}`} aria-labelledby="match-heading">
            <p id="match-heading">{roleOnly ? (es ? "Tu puesto objetivo" : "Your target role") : copy.score}</p>
            <div className={roleOnly ? "ats-role-name" : "ats-match-number"}><strong>{roleOnly ? result.targetRole : result.score ?? "—"}</strong>{!roleOnly && result.score !== null && <span>%</span>}</div>
            <h1 className="ats-match-status">{roleOnly ? (es ? "Tu revisión inicial está lista" : "Your first review is ready") : result.score === null ? copy.unavailable : result.verdict}</h1>
            <small>{roleOnly ? (es ? "Orientación de contenido y estructura. Añade una convocatoria para comparar requisitos concretos." : "Content and structure guidance. Add a job description to compare concrete requirements.") : result.score === null ? copy.unavailableHelp : copy.estimate}</small>
            {!roleOnly && result.score !== null && <div className="ats-score-guide">
              <span>{copy.scoreGuide}</span>
              <div className="ats-score-scale"><i style={{ left: `${result.score}%` }} /></div>
              <div>{copy.scoreRanges.map((range) => <small key={range}>{range}</small>)}</div>
            </div>}
          </section>

          {!roleOnly && result.keywordMatch && <section className="ats-visible-keywords" aria-labelledby="keyword-evidence-title">
            <h2 id="keyword-evidence-title">{copy.keywords}</h2>
            <p>{es ? "Esto explica el porcentaje. Encontrar el término no demuestra por sí solo el nivel de experiencia." : "This explains the percentage. Finding a term alone does not prove the level of experience."}</p>
            <div>
              {result.keywordMatch.matched.map((keyword) => <span className="matched" aria-label={`${keyword}: ${copy.matched}`} key={`matched-${keyword}`}><b aria-hidden="true">✓</b>{keyword}</span>)}
              {result.keywordMatch.missing.map((keyword) => <span className="missing" aria-label={`${keyword}: ${copy.missing}`} key={`missing-${keyword}`}><b aria-hidden="true">×</b>{keyword}</span>)}
            </div>
          </section>}
        </div>
        <ResumeImprovementPlan result={result} resumeText={resumeText} language={language} onReanalyze={onReset} />
      </div>

      <details className="ats-technical-details">
        <summary>{copy.technical}<span aria-hidden="true">▾</span></summary>
        <div className="ats-technical-content">
          <p className="ats-score-explanation">{roleOnly ? (es ? "Revisamos el documento. Sin una convocatoria, no evaluamos los requisitos del empleador ni calculamos compatibilidad con un puesto." : "We review the document. Without a job description, we cannot assess employer requirements or calculate a job match.") : copy.method}</p>
          <div className="ats-technical-groups">
            {result.auditGroups.map((group) => {
              const issues = group.checks.filter((audit) => audit.status !== "pass");
              const correct = group.checks.filter((audit) => audit.status === "pass");
              const correctLabel = es
                ? `${correct.length} de ${group.checks.length} correctas`
                : `${correct.length} of ${group.checks.length} passed`;

              if (issues.length === 0) {
                return <details className="ats-technical-group ats-technical-group-complete" key={group.id}>
                  <summary>
                    <div><h2>{group.label}</h2><span>{correctLabel}</span></div>
                    <strong>{group.score}%</strong>
                    <b aria-hidden="true">▾</b>
                  </summary>
                  <div className="ats-passed-checks">
                    {correct.map((audit) => <div className="ats-passed-check" key={audit.id}><span aria-hidden="true">✓</span><strong>{audit.title}</strong><p>{audit.evidence}</p></div>)}
                  </div>
                </details>;
              }

              return <section className="ats-technical-group ats-technical-group-review" key={group.id}>
                <header>
                  <div><h2>{group.label}</h2><span>{issues.length} {copy.review} · {correctLabel}</span></div>
                  <strong>{group.score}%</strong>
                </header>
                <div className="ats-audit-checks">
                  {issues.map((audit) => <article className={audit.status} key={audit.id}>
                    <span aria-hidden="true">!</span>
                    <div><header><h3>{audit.title}</h3><b>{copy.status[audit.status as keyof typeof copy.status]}</b></header><small>{copy.evidence}</small><p>{audit.evidence}</p><em>{audit.recommendation}</em></div>
                  </article>)}
                </div>
                {correct.length > 0 && <div className="ats-passed-checks">
                  {correct.map((audit) => <div className="ats-passed-check" key={audit.id}><span aria-hidden="true">✓</span><strong>{audit.title}</strong><p>{audit.evidence}</p></div>)}
                </div>}
              </section>;
            })}
          </div>
          {result.strengths.length > 0 && <section className="ats-technical-strengths"><h2>{copy.strengths}</h2><ul>{result.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul></section>}
        </div>
      </details>

      <div className="ats-report-footer">
        <button type="button" onClick={onEdit}>{es ? "Cambiar convocatoria o puesto" : "Change job description or role"}</button>
        <button type="button" onClick={onReset}>{copy.another}</button>
      </div>
    </div>
  );
}
