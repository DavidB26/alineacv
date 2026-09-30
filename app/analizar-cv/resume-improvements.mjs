import { validateResumeBullet } from "./analysis.mjs";

const EDIT_STORAGE_PREFIX = "alineacv-inline-edits-v1";

export function resumeEditStorageKey(sourceText) {
  let hash = 2166136261;
  for (let index = 0; index < sourceText.length; index += 1) {
    hash ^= sourceText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${EDIT_STORAGE_PREFIX}:${(hash >>> 0).toString(36)}`;
}

const sectionNames = [
  ["profile", /^(perfil(?: profesional)?|resumen(?: profesional)?|objetivo(?: profesional)?|sobre mi|professional summary|summary|profile|objective|about me)$/i],
  ["specializations", /^(areas? de especializacion|especialidades|areas? de practica|areas? of expertise|specializations?|expertise)$/i],
  ["experience", /^(experiencia(?: profesional| laboral)?|trayectoria profesional|professional experience|work experience|employment|work history)(?:\s*[-–—]\s*(?:continuacion|continuación|continued))?$/i],
  ["education", /^(educacion|formacion(?: academica)?|estudios|education|academic background)$/i],
  ["skills", /^(habilidades(?: tecnicas)?|competencias(?: tecnicas)?|tecnologias|software(?: skills?)?|technical skills|skills|competencies|tools)$/i],
  ["projects", /^(proyectos(?: personales| independientes| destacados| adicionales| relevantes)?|proyectos y evidencia relevante|algunos trabajos mios|projects|independent projects|additional projects|relevant projects|relevant projects and evidence)$/i],
  ["training", /^(formacion y habilidades en desarrollo|habilidades en desarrollo|training and developing skills)$/i],
  ["certifications", /^(certificaciones|cursos(?: y certificaciones)?(?: en linea| en línea)?|formacion complementaria|certifications|courses|additional training)$/i],
  ["languages", /^(idiomas?|lenguajes?|languages?)$/i],
  ["interests", /^(intereses|hobbies|interests)$/i],
  ["contact", /^(contacto|contact)$/i],
  ["other", /^(referencias|publicaciones|voluntariado|informacion adicional|references|publications|volunteering|additional information)$/i],
];

export function repairWrappedResumeLines(sourceText) {
  const lines = sourceText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const repaired = [];
  let activeBullet = -1;

  for (const originalLine of lines) {
    const pageLabel = originalLine.match(/^(.*?)\s*\|\s*(?:curr[ií]culum vitae|cv)(?:\s+(?:profesional|adaptado))?\s+(?:p[aá]gina|page)\s+\d+\.?\s*$/i);
    let line = originalLine;
    if (pageLabel) {
      const beforeLabel = pageLabel[1].trim();
      const sentenceAndName = beforeLabel.match(/^(.*?[.!?])\s+[\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+){1,5}$/u);
      line = sentenceAndName?.[1] ?? beforeLabel;
      if (!sentenceAndName && repaired.some((item) => item.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())) continue;
    }
    if (!line) continue;
    const normalized = line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/:$/, "").trim();
    const section = sectionNames.some(([, pattern]) => pattern.test(normalized));
    const bullet = /^(?:[-•*▪‣]|\(cid:\d+\))\s*/.test(line);
    const datedHeading = /(?:19|20)\d{2}|actualidad|presente|present/i.test(line) && line.length < 180;
    const contact = /@|https?:\/\/|linkedin|\+?\d[\d\s().-]{7,}\d/i.test(line);
    const uppercaseHeading = line.length < 80 && line === line.toUpperCase() && /[\p{L}]/u.test(line);
    const acronymContinuation = activeBullet >= 0
      && line.length <= 18
      && /^[A-ZÁÉÍÓÚÑ0-9/&+.-]+$/.test(line)
      && /(?:\b(?:a|al|de|del|en|para|por|con|y|e|u|o)|[,;:])\s*$/i.test(repaired[activeBullet]);
    const projectTitle = /^(?:proyecto|project)\s*:\s*/i.test(line);
    const entryHeading = line.length < 190 && /^[A-ZÁÉÍÓÚÑ]/.test(line) && /[|·]/.test(line);

    if (bullet) {
      repaired.push(line);
      activeBullet = repaired.length - 1;
    } else if (activeBullet >= 0 && !section && !datedHeading && !contact && (!uppercaseHeading || acronymContinuation) && !projectTitle && !entryHeading) {
      repaired[activeBullet] += " " + line;
    } else {
      repaired.push(line);
      activeBullet = -1;
    }
  }
  return repaired.join("\n");
}

export function reorganizeResume(sourceText) {
  const header = [];
  const sections = [];
  let current = null;
  for (const original of repairWrappedResumeLines(sourceText).split(/\r?\n/)) {
    const line = original.trim();
    if (!line) continue;
    const normalized = line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/:$/, "").trim();
    const kind = sectionNames.find(([, pattern]) => pattern.test(normalized));
    if (kind) {
      current = { kind: kind[0], heading: line, lines: [], order: sections.length };
      sections.push(current);
    } else if (current) current.lines.push(line);
    else if (!header.some((item) => item.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())) header.push(line);
  }
  const order = sectionNames.map(([kind]) => kind);
  sections.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.order - b.order);
  const text = [header.join("\n"), ...sections.map((section) => [section.heading, ...section.lines].join("\n"))].filter(Boolean).join("\n\n");
  return { header, sections, text };
}

export function improvementActions(result, language = "es") {
  const es = language === "es";
  const actions = [];
  const missing = result.keywordMatch?.missing ?? [];
  if (result.targetMode === "role") {
    actions.push({
      id: "role-focus",
      title: es ? `Orienta tu perfil a ${result.targetRole}` : `Focus your summary on ${result.targetRole}`,
      evidence: result.resumeSkills
        ? (es ? `En tu CV detectamos estas habilidades: ${result.resumeSkills}.` : `We detected these skills in your resume: ${result.resumeSkills}.`)
        : (es ? "No detectamos una lista clara de habilidades en el CV." : "We did not detect a clear skills list in the resume."),
      description: es
        ? "Relaciona tu experiencia real con el cargo y prioriza uno o dos proyectos o logros que lo respalden."
        : "Connect your actual experience to the role and prioritize one or two supporting projects or achievements.",
    });
  } else if (missing.length) {
    const terms = missing.slice(0, 3).join(", ") + (missing.length > 3 ? ` (+${missing.length - 3})` : "");
    actions.push({
      id: "vacancy-evidence",
      title: es ? "Aclara los requisitos no encontrados" : "Clarify requirements not found",
      evidence: es ? `No encontramos ${terms} en el texto de tu CV.` : `We did not find ${terms} in your resume text.`,
      description: es ? `Revisa ${terms}. Si tienes esa experiencia, explica dónde la aplicaste; si no, no la añadas.` : `Review ${terms}. If you have that experience, explain where you used it; otherwise, do not add it.`,
    });
  } else if (!result.keywordMatch) {
    actions.push({
      id: "vacancy-detail",
      title: es ? "Completa la descripción de la vacante" : "Complete the job description",
      evidence: es ? "El texto ingresado no contiene requisitos concretos reconocibles." : "The supplied text does not contain recognizable concrete requirements.",
      description: es ? "Incluye las funciones, herramientas y requisitos para poder calcular una coincidencia." : "Include duties, tools and requirements so a match can be calculated.",
    });
  }
  const priority = ["email", "phone", "extractable-text", "clean-text", "experience-section", "education-section", "skills-section", "profile-section", "measured-results", "action-verbs"];
  const checks = result.auditGroups.flatMap((group) => group.checks).filter((check) => check.status !== "pass");
  const weight = (check) => (check.status === "fail" ? 0 : 100) + (priority.includes(check.id) ? priority.indexOf(check.id) : 30);
  checks.sort((a, b) => weight(a) - weight(b));
  for (const check of checks.slice(0, 3 - actions.length)) {
    actions.push({ id: check.id, title: check.title, evidence: check.evidence, description: check.recommendation });
  }
  if (!actions.length) actions.push({
    id: "review-export",
    title: es ? "Revisa tu CV antes de enviarlo" : "Review your resume before sending it",
    evidence: es ? "Las 21 comprobaciones principales no detectaron una corrección prioritaria." : "The 21 main checks did not identify a priority correction.",
    description: es ? "Confirma que los datos, fechas y requisitos estén respaldados por tu experiencia." : "Confirm that your details, dates and requirements are supported by your experience.",
  });
  return actions;
}

function editableLines(sourceText) {
  let currentSection = "";
  return sourceText.split(/\r?\n/).map((originalLine, lineIndex) => {
    const trimmed = originalLine.trim();
    const normalized = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/:$/, "").trim();
    const section = sectionNames.find(([, pattern]) => pattern.test(normalized));
    if (section) {
      currentSection = section[0];
      return null;
    }
    const bullet = trimmed.match(/^([-•*▪‣]\s*)(.+)$/);
    const prefix = bullet?.[1] ?? "";
    const text = (bullet?.[2] ?? trimmed).trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    const contactLike = /@|https?:\/\/|linkedin|\+?\d[\d\s().-]{7,}\d/i.test(text);
    const datedHeading = !bullet && /(?:19|20)\d{2}|actualidad|presente|present/i.test(text);
    const eligibleSection = currentSection === "experience" || currentSection === "projects";
    if (words < 5 || text.length > 260 || contactLike || datedHeading || (!bullet && !eligibleSection)) return null;
    return {
      lineIndex,
      originalLine,
      originalText: text,
      prefix,
      rank: (bullet ? 10 : 0) + (currentSection === "experience" ? 6 : currentSection === "projects" ? 4 : 0),
    };
  }).filter(Boolean).sort((a, b) => b.rank - a.rank || a.lineIndex - b.lineIndex);
}

function rulePasses(rule, validation) {
  if (rule.type === "metric") return validation.hasMetric;
  if (rule.type === "quantified-action") return validation.hasQuantifiedAction;
  if (rule.type === "action") return validation.hasActionVerb;
  return validation.matchedKeywords.includes(rule.keyword);
}

export function validateInlineRule(rule, value) {
  const validation = validateResumeBullet(value, { keywords: rule.keyword ? [rule.keyword] : [] });
  return { ...validation, passes: rulePasses(rule, validation) };
}

export function editableImprovementTargets(result, sourceText, language = "es") {
  const es = language === "es";
  const candidates = editableLines(sourceText);
  if (!candidates.length) return [];
  const checks = new Map(result.auditGroups.flatMap((group) => group.checks).map((item) => [item.id, item]));
  const specs = [];
  const measured = checks.get("measured-results");
  const quantified = checks.get("quantified-actions");
  const actions = checks.get("action-verbs");

  if (measured?.status !== "pass") specs.push({
    id: "measured-results",
    type: "metric",
    sourceActionId: "measured-results",
    title: measured.title,
    evidence: es ? "Esta viñeta todavía no contiene un resultado cuantificable." : "This bullet does not yet contain a measurable result.",
    recommendation: measured.recommendation,
  });
  if (quantified?.status !== "pass") specs.push({
    id: "quantified-actions",
    type: "quantified-action",
    sourceActionId: "quantified-actions",
    title: quantified.title,
    evidence: es ? "Esta viñeta no combina todavía una acción con una cifra respaldada." : "This bullet does not yet combine an action with a supported figure.",
    recommendation: quantified.recommendation,
  });
  if (actions?.status !== "pass") specs.push({
    id: "action-verbs",
    type: "action",
    sourceActionId: "action-verbs",
    title: actions.title,
    evidence: es ? "Esta viñeta todavía no usa un verbo de acción reconocido." : "This bullet does not yet use a recognized action verb.",
    recommendation: actions.recommendation,
  });

  const targets = [];
  for (const rule of specs.slice(0, 3)) {
    const keyword = rule.keyword ? [rule.keyword] : [];
    const failing = candidates.filter((candidate) => !rulePasses(rule, validateResumeBullet(candidate.originalText, { keywords: keyword })));
    if (!failing.length) continue;
    const candidate = failing.find((item) => !targets.some((target) => target.lineIndex === item.lineIndex)) ?? failing[0];
    const existing = targets.find((target) => target.lineIndex === candidate.lineIndex);
    if (existing) existing.rules.push(rule);
    else targets.push({ ...candidate, id: `inline-line-${candidate.lineIndex}`, rules: [rule] });
  }
  return targets;
}

export function applyResumeLineEdits(sourceText, edits) {
  const lines = sourceText.split(/\r?\n/);
  for (const edit of edits) lines[edit.lineIndex] = `${edit.prefix}${edit.currentText.trim()}`;
  return lines.join("\n");
}
