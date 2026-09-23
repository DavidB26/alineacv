import { reorganizeResume } from "./resume-improvements.mjs";
import {
  extractResumeContacts,
  inferResumeHeadline,
  inferResumeName,
  interestBlocks,
  languageBlocks,
  plausibleTarget,
  recoverEducationBlocks,
  recoverExperienceBlocks,
  recoverProfileText,
  skillBlocks,
  specializationLines,
} from "./resume-semantics.mjs";

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function explicitTarget(value) {
  const cleaned = String(value ?? "")
    .replace(/^(?:puesto|vacante|cargo|position|role|job)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return /^(?:convocatoria cargada|vacante analizada|job description added|analyzed job)$/i.test(cleaned) ? "" : plausibleTarget(cleaned);
}

function cleanTarget(value, language = "es") {
  const fallback = language === "es" ? "la vacante seleccionada" : "the selected role";
  return explicitTarget(value) || fallback;
}

const DOMAIN_PATTERNS = [
  ["legal", /\b(abogad\w*|derecho|legal|litig\w*|contrat\w*|jurid\w*|compliance|cumplimiento|fiscal|penal|civil)\b/i],
  ["architecture", /\b(arquitect\w*|autocad|revit|bim|obra|construccion|planos?|urbanismo|sketchup)\b/i],
  ["health", /\b(medic\w*|enfermer\w*|clinica|paciente|salud|hospital|terapia|farmac\w*)\b/i],
  ["marketing", /\b(marketing|seo|sem|campan\w*|contenido|social media|publicidad|ads|marca)\b/i],
  ["finance", /\b(contab\w*|finanz\w*|auditor\w*|impuesto|presupuesto|tesorer\w*|niif|ifrs)\b/i],
  ["operations", /\b(logistica|operaciones|inventario|compras|supply chain|calidad|produccion)\b/i],
  ["software", /\b(desarroll\w*|software|frontend|backend|fullstack|program\w*|javascript|typescript|react|angular|python|api|sql|devops)\b/i],
  ["design", /\b(disen\w*|designer|figma|photoshop|illustrator|indesign|ux|ui|branding|identidad visual)\b/i],
];

export function inferProfessionalDomain(sourceText, targetLabel = "") {
  const normalizedTarget = normalize(targetLabel);
  const targetDomain = DOMAIN_PATTERNS.find(([, pattern]) => pattern.test(normalizedTarget))?.[0];
  if (targetDomain) return targetDomain;
  const haystack = normalize(sourceText);
  return DOMAIN_PATTERNS.find(([, pattern]) => pattern.test(haystack))?.[0] ?? "general";
}

function suggestionFor(domain, keyword, target, mode, language) {
  const es = language === "es";
  if (mode === "learning") {
    return {
      title: es ? "Formación en " + keyword : keyword + " training",
      text: es
        ? "Desarrollar conocimientos en " + keyword + " mediante formación guiada y práctica aplicada a " + target + "."
        : "Build knowledge in " + keyword + " through guided training and practice applied to " + target + ".",
    };
  }

  const spanish = {
    legal: ["Caso práctico de " + keyword, "Analizar un caso práctico relacionado con " + keyword + ", documentando el marco aplicable, el criterio jurídico utilizado y las conclusiones."],
    architecture: ["Proyecto conceptual de " + keyword, "Desarrollar un proyecto conceptual aplicando " + keyword + ", con planos, decisiones técnicas y entregables verificables."],
    design: ["Caso de estudio de " + keyword, "Crear un caso de estudio aplicando " + keyword + ", desde el problema y el proceso de diseño hasta los entregables y aprendizajes."],
    health: ["Caso práctico de " + keyword, "Desarrollar un caso práctico supervisado sobre " + keyword + ", documentando el protocolo, las decisiones y los aprendizajes sin incluir datos de pacientes."],
    marketing: ["Proyecto de campaña con " + keyword, "Diseñar un proyecto de campaña aplicando " + keyword + ", con objetivo, audiencia, ejecución y métricas definidas para su posterior validación."],
    finance: ["Caso práctico de " + keyword, "Resolver un caso práctico aplicando " + keyword + ", documentando supuestos, procedimiento, controles y conclusiones."],
    operations: ["Proyecto de mejora con " + keyword, "Diseñar una propuesta de mejora aplicando " + keyword + ", con diagnóstico, proceso, entregables y criterios de medición."],
    software: ["Proyecto práctico con " + keyword, "Construir un proyecto demostrable aplicando " + keyword + ", documentando el problema, la implementación, las pruebas y los resultados observados."],
    general: ["Proyecto práctico de " + keyword, "Desarrollar un proyecto o caso práctico aplicando " + keyword + ", con objetivo, proceso, entregables y aprendizajes verificables."],
  };
  const english = {
    legal: ["Practical " + keyword + " case", "Analyze a practical case involving " + keyword + ", documenting the applicable framework, legal reasoning and conclusions."],
    architecture: ["Concept project using " + keyword, "Develop a concept project using " + keyword + ", with drawings, technical decisions and verifiable deliverables."],
    design: [keyword + " case study", "Create a case study using " + keyword + ", covering the problem, design process, deliverables and lessons learned."],
    health: ["Practical " + keyword + " case", "Develop a supervised practical case about " + keyword + ", documenting the protocol, decisions and lessons without patient data."],
    marketing: [keyword + " campaign project", "Design a campaign project using " + keyword + ", with an objective, audience, execution plan and metrics ready for validation."],
    finance: ["Practical " + keyword + " case", "Solve a practical case using " + keyword + ", documenting assumptions, procedure, controls and conclusions."],
    operations: [keyword + " improvement project", "Design an improvement proposal using " + keyword + ", with a diagnosis, process, deliverables and measurement criteria."],
    software: ["Practical project using " + keyword, "Build a demonstrable project using " + keyword + ", documenting the problem, implementation, tests and observed results."],
    general: ["Practical " + keyword + " project", "Develop a practical project or case using " + keyword + ", with an objective, process, deliverables and verifiable lessons."],
  };
  const [title, text] = (es ? spanish : english)[domain] ?? (es ? spanish.general : english.general);
  return { title, text };
}

export function missingKeywordProposals(result, targetLabel, sourceText, language = "es") {
  const domain = inferProfessionalDomain(sourceText, targetLabel);
  const target = cleanTarget(targetLabel, language);
  return (result.keywordMatch?.missing ?? []).map((keyword, index) => {
    const project = suggestionFor(domain, keyword, target, "project", language);
    const learning = suggestionFor(domain, keyword, target, "learning", language);
    return {
      id: "gap-" + index + "-" + normalize(keyword).replace(/[^a-z0-9]+/g, "-"),
      keyword,
      domain,
      project,
      learning,
    };
  });
}

function joinedKeywords(keywords, language) {
  if (keywords.length <= 1) return keywords[0] ?? "";
  const last = normalize(keywords.at(-1));
  const conjunction = language === "es" ? (/^(?:i|hi)/.test(last) ? " e " : " y ") : " and ";
  return keywords.slice(0, -1).join(", ") + conjunction + keywords.at(-1);
}

function softwareProjectCopy(keywords, language) {
  const pick = (pattern) => keywords.find((keyword) => pattern.test(normalize(keyword)));
  const frontend = pick(/^(?:angular|react|vue|svelte|frontend)$/);
  const backend = pick(/^(?:java|python|php|node(?:\.js)?|c#|\.net|spring|laravel|backend)$/);
  const testing = pick(/^(?:selenium|cypress|playwright|jest|testing|qa)$/);
  const versionControl = pick(/^(?:svn|git|github|gitlab|bitbucket)$/);
  const database = pick(/^(?:bd|base de datos|database|sql|mysql|postgresql|oracle|mongodb)$/);
  const artificialIntelligence = pick(/^(?:ia|ai|inteligencia artificial|artificial intelligence|machine learning)$/);
  const categorized = new Set([frontend, backend, testing, versionControl, database, artificialIntelligence].filter(Boolean));
  const other = keywords.filter((keyword) => !categorized.has(keyword));

  if (language === "es") {
    const implementation = [];
    if (frontend) implementation.push("una interfaz en " + frontend);
    if (backend) implementation.push("servicios en " + backend);
    if (database) implementation.push("persistencia en " + database);
    const sentences = ["Construir una aplicación funcional" + (implementation.length ? " con " + joinedKeywords(implementation, "es") : "") + "."];
    if (artificialIntelligence) sentences.push("Incorporar un componente de " + artificialIntelligence + " aplicado a una función concreta del producto.");
    if (testing) sentences.push("Automatizar las pruebas del flujo principal con " + testing + ".");
    if (versionControl) sentences.push("Gestionar el código fuente y el historial de cambios con " + versionControl + ".");
    if (other.length) sentences.push("Integrar " + joinedKeywords(other, "es") + " dentro del flujo principal.");
    sentences.push("Documentar la arquitectura, la configuración, las pruebas y las instrucciones de ejecución.");
    const title = frontend && backend
      ? "Aplicación web con " + joinedKeywords([frontend, backend], "es")
      : database && artificialIntelligence
        ? "Aplicación con " + joinedKeywords([database, artificialIntelligence], "es")
        : "Proyecto técnico con " + joinedKeywords(keywords, "es");
    return [title, sentences.join(" ")];
  }

  const implementation = [];
  if (frontend) implementation.push("a " + frontend + " interface");
  if (backend) implementation.push(backend + " services");
  if (database) implementation.push(database + " persistence");
  const sentences = ["Build a functional application" + (implementation.length ? " with " + joinedKeywords(implementation, "en") : "") + "."];
  if (artificialIntelligence) sentences.push("Add a " + artificialIntelligence + " component for one concrete product function.");
  if (testing) sentences.push("Automate the core flow tests with " + testing + ".");
  if (versionControl) sentences.push("Manage source code and change history with " + versionControl + ".");
  if (other.length) sentences.push("Integrate " + joinedKeywords(other, "en") + " into the core flow.");
  sentences.push("Document the architecture, configuration, tests and setup instructions.");
  const title = frontend && backend
    ? "Web application using " + joinedKeywords([frontend, backend], "en")
    : database && artificialIntelligence
      ? "Application using " + joinedKeywords([database, artificialIntelligence], "en")
      : "Technical project using " + joinedKeywords(keywords, "en");
  return [title, sentences.join(" ")];
}

export function automaticProjectSuggestions(result, targetLabel, sourceText, language = "es") {
  const missing = result.keywordMatch?.missing ?? [];
  if (!missing.length) return [];
  const domain = inferProfessionalDomain(sourceText, targetLabel);
  const groupSize = Math.ceil(missing.length / Math.min(2, missing.length));
  const groups = [];
  for (let index = 0; index < missing.length; index += groupSize) groups.push(missing.slice(index, index + groupSize));

  return groups.map((keywords, index) => {
    const terms = joinedKeywords(keywords, language);
    const spanish = {
      legal: ["Caso jurídico sobre " + terms, "Elaborar un expediente práctico que aplique " + terms + ", identificando el marco normativo, los riesgos, el criterio jurídico y una conclusión documentada."],
      architecture: ["Propuesta arquitectónica con " + terms, "Desarrollar una propuesta aplicando " + terms + ", con planos, memoria descriptiva, decisiones técnicas y entregables verificables."],
      design: ["Caso de estudio con " + terms, "Diseñar y documentar un caso de estudio que aplique " + terms + ", desde la investigación y definición del problema hasta los entregables y aprendizajes."],
      health: ["Caso práctico sobre " + terms, "Desarrollar un caso simulado y supervisado que aplique " + terms + ", documentando el protocolo, las decisiones, el seguimiento y los aprendizajes sin incluir datos de pacientes."],
      marketing: ["Campaña integral con " + terms, "Diseñar una campaña que integre " + terms + ", definiendo audiencia, mensaje, canales, piezas, presupuesto y métricas de evaluación."],
      finance: ["Caso financiero con " + terms, "Resolver un caso práctico utilizando " + terms + ", con supuestos, procedimiento, controles, análisis de resultados y conclusiones."],
      operations: ["Mejora operativa con " + terms, "Diseñar una mejora de proceso aplicando " + terms + ", con diagnóstico, flujo propuesto, responsables, entregables e indicadores de seguimiento."],
      software: ["Proyecto técnico con " + terms, "Construir una aplicación funcional que integre " + terms + ". Documentar la arquitectura, el flujo principal, la configuración, las pruebas y las instrucciones de ejecución."],
      general: ["Proyecto aplicado con " + terms, "Desarrollar un proyecto práctico que aplique " + terms + ", con un objetivo definido, metodología, entregables y criterios claros de evaluación."],
    };
    const english = {
      legal: ["Legal case using " + terms, "Prepare a practical case using " + terms + ", documenting the legal framework, risks, reasoning and conclusion."],
      architecture: ["Architecture proposal using " + terms, "Develop a proposal using " + terms + ", with drawings, a design brief, technical decisions and verifiable deliverables."],
      design: ["Case study using " + terms, "Design and document a case study using " + terms + ", from research and problem definition through deliverables and lessons learned."],
      health: ["Practical case using " + terms, "Develop a supervised simulated case using " + terms + ", documenting the protocol, decisions, follow-up and lessons without patient data."],
      marketing: ["Integrated campaign using " + terms, "Design a campaign using " + terms + ", defining its audience, message, channels, assets, budget and evaluation metrics."],
      finance: ["Finance case using " + terms, "Solve a practical case using " + terms + ", with assumptions, procedures, controls, result analysis and conclusions."],
      operations: ["Operations improvement using " + terms, "Design a process improvement using " + terms + ", with a diagnosis, proposed workflow, owners, deliverables and tracking indicators."],
      software: ["Technical project using " + terms, "Build a functional application integrating " + terms + ". Document its architecture, core flow, configuration, tests and setup instructions."],
      general: ["Applied project using " + terms, "Develop a practical project using " + terms + ", with a defined objective, method, deliverables and clear evaluation criteria."],
    };
    const [title, text] = domain === "software"
      ? softwareProjectCopy(keywords, language)
      : (language === "es" ? spanish : english)[domain] ?? (language === "es" ? spanish.general : english.general);
    return {
      id: "automatic-project-" + index,
      keyword: terms,
      keywords,
      domain,
      mode: "project",
      title,
      text,
      included: true,
    };
  });
}

export function appendConfirmedEvidence(sourceText, proposals, language = "es") {
  const projects = proposals.filter((item) => item.included && item.mode === "project" && item.text.trim());
  const learning = proposals.filter((item) => item.included && item.mode === "learning" && item.text.trim());
  const blocks = [sourceText.trim()];

  if (projects.length) {
    blocks.push([
      language === "es" ? "PROYECTOS RELEVANTES" : "RELEVANT PROJECTS",
      ...projects.flatMap((item) => [(language === "es" ? "Proyecto: " : "Project: ") + (item.title.trim() || item.keyword), "• " + item.text.trim()]),
    ].join("\n"));
  }
  if (learning.length) {
    blocks.push([
      language === "es" ? "FORMACIÓN Y HABILIDADES EN DESARROLLO" : "TRAINING AND DEVELOPING SKILLS",
      ...learning.map((item) => "• " + item.text.trim()),
    ].join("\n"));
  }
  return blocks.filter(Boolean).join("\n\n");
}

const SPANISH_VERBS = new Map([
  ["aumente", "Aumentar"], ["alcance", "Alcanzar"], ["analice", "Analizar"], ["automatice", "Automatizar"],
  ["construi", "Construir"], ["coordine", "Coordinar"], ["cree", "Crear"], ["desarrolle", "Desarrollar"],
  ["disene", "Diseñar"], ["elabore", "Elaborar"], ["gestione", "Gestionar"], ["implemente", "Implementar"],
  ["investigue", "Investigar"], ["lidere", "Liderar"], ["mejore", "Mejorar"], ["negocie", "Negociar"],
  ["optimice", "Optimizar"], ["participe", "Participar"], ["prepare", "Preparar"], ["reduje", "Reducir"],
  ["revise", "Revisar"], ["supervise", "Supervisar"], ["valide", "Validar"],
]);

export function polishResumeBullet(value, language = "es") {
  let text = String(value ?? "").replace(/^(?:[-•*▪‣]|\(cid:\d+\))\s*/, "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (language === "es") {
    text = text.replace(/^Encargad[oa]\s+de\s+realizar\s+/i, "Realizar ");
    const first = text.match(/^([\p{L}]+)/u)?.[1] ?? "";
    const infinitive = SPANISH_VERBS.get(normalize(first));
    if (infinitive) text = infinitive + text.slice(first.length);
  }
  text = text.charAt(0).toUpperCase() + text.slice(1);
  text = text.replace(/[,;:]+$/, "");
  if (!/[.!?]$/.test(text)) text += ".";
  return text;
}

const MONTHS = new Map([
  ["ene", "01"], ["enero", "01"], ["jan", "01"], ["january", "01"],
  ["feb", "02"], ["febrero", "02"], ["february", "02"],
  ["mar", "03"], ["marzo", "03"], ["march", "03"],
  ["abr", "04"], ["abril", "04"], ["apr", "04"], ["april", "04"],
  ["may", "05"], ["mayo", "05"],
  ["jun", "06"], ["junio", "06"], ["june", "06"],
  ["jul", "07"], ["julio", "07"], ["july", "07"],
  ["ago", "08"], ["agosto", "08"], ["aug", "08"], ["august", "08"],
  ["sep", "09"], ["sept", "09"], ["septiembre", "09"], ["september", "09"],
  ["oct", "10"], ["octubre", "10"], ["october", "10"],
  ["nov", "11"], ["noviembre", "11"], ["november", "11"],
  ["dic", "12"], ["diciembre", "12"], ["dec", "12"], ["december", "12"],
]);

export function normalizeResumeDates(value) {
  return String(value ?? "").replace(/\b([A-Za-zÁÉÍÓÚáéíóú]{3,10})[.\s]+((?:19|20)\d{2})\b/g, (match, month, year) => {
    const number = MONTHS.get(normalize(month));
    return number ? number + "/" + year : match;
  });
}

export function splitResumeEntry(value) {
  const line = normalizeResumeDates(String(value ?? "").replace(/\s+/g, " ").trim());
  const match = line.match(/^(.*?)(\b(?:\d{2}\/(?:19|20)\d{2}|(?:19|20)\d{2})(?:\s*[-–—]\s*(?:\d{2}\/(?:19|20)\d{2}|(?:19|20)\d{2}|presente|actualidad|present))?)\s*$/i);
  if (!match) return { title: line, date: "" };
  return {
    title: match[1].replace(/[|·,\s-]+$/, "").trim(),
    date: match[2].replace(/\s*[-–—]\s*/g, " - "),
  };
}

function isBullet(line) {
  return /^(?:[-•*▪‣]|\(cid:\d+\))\s*/.test(line);
}

function lineScore(line, keywords) {
  const plain = normalize(line);
  const keywordScore = keywords.reduce((total, keyword) => total + (plain.includes(normalize(keyword)) ? 10 : 0), 0);
  const evidenceScore = /\d|%|doble|mitad/.test(plain) ? 2 : 0;
  return keywordScore + evidenceScore;
}

function prioritizeSectionLines(lines, keywords, language) {
  const output = [];
  let group = null;
  const flush = () => {
    if (!group) return;
    output.push(...group.headers);
    output.push(...group.bullets
      .map((line, index) => ({ line: "• " + polishResumeBullet(line, language), index, score: lineScore(line, keywords) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((item) => item.line));
  };

  for (const line of lines) {
    if (isBullet(line)) {
      if (!group) group = { headers: [], bullets: [] };
      group.bullets.push(line);
    } else {
      if (!group || group.bullets.length) {
        flush();
        group = { headers: [normalizeResumeDates(line)], bullets: [] };
      } else group.headers.push(normalizeResumeDates(line));
    }
  }
  flush();
  return output;
}

function uniqueLines(lines) {
  const seen = new Set();
  return lines.filter((line) => {
    const key = normalize(line);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compactDelimitedLines(lines) {
  const items = uniqueLines(lines.flatMap((line) => line.split("|").map((item) => item.trim())).filter(Boolean));
  return items.length ? [items.join(" | ")] : [];
}

function originalHeadline(header) {
  return header.slice(1).find((line) =>
    !/@|https?:\/\/|linkedin|portfolio|portafolio|\+?\d[\d\s().-]{7,}\d/i.test(line)) ?? "";
}

function entryBlocks(lines, language) {
  const entries = [];
  let current = null;
  const push = () => {
    if (current && (current.title || current.meta.length || current.bullets.length)) entries.push(current);
  };
  for (const line of lines) {
    if (isBullet(line)) {
      if (!current) current = { type: "entry", title: "", date: "", meta: [], bullets: [] };
      current.bullets.push(polishResumeBullet(line, language));
      continue;
    }
    const split = splitResumeEntry(line.replace(/^(?:proyecto|project)\s*:\s*/i, ""));
    if (!current || split.date || current.bullets.length) {
      push();
      current = { type: "entry", title: split.title, date: split.date, meta: [], bullets: [] };
    } else current.meta.push(split.title);
  }
  push();
  return entries;
}

function sectionBlocks(kind, lines, language) {
  if (kind === "experience" || kind === "projects" || kind === "education" || kind === "training") {
    return entryBlocks(lines, language);
  }
  if (kind === "certifications") return [{ type: "paragraph", text: lines.join(" ").replace(/^[-•*▪‣]\s*/, "") }];
  if (kind === "skills" || kind === "specializations" || kind === "languages") {
    return lines.map((line) => {
      const separator = line.indexOf(":");
      return separator > 0
        ? { type: "row", label: line.slice(0, separator).trim(), value: line.slice(separator + 1).trim() }
        : { type: "paragraph", text: line.replace(/^[-•*▪‣]\s*/, "") };
    });
  }
  return lines.map((line) => ({ type: "paragraph", text: line.replace(/^[-•*▪‣]\s*/, "") }));
}

const SECTION_HEADINGS = {
  es: {
    profile: "PERFIL PROFESIONAL",
    specializations: "ÁREAS DE ESPECIALIZACIÓN",
    experience: "EXPERIENCIA PROFESIONAL",
    projects: "PROYECTOS RELEVANTES",
    skills: "HABILIDADES",
    training: "FORMACIÓN Y HABILIDADES EN DESARROLLO",
    certifications: "CURSOS Y CERTIFICACIONES",
    education: "FORMACIÓN ACADÉMICA",
    languages: "IDIOMAS",
    interests: "INTERESES",
    other: "INFORMACIÓN ADICIONAL",
  },
  en: {
    profile: "PROFESSIONAL SUMMARY",
    specializations: "AREAS OF EXPERTISE",
    experience: "PROFESSIONAL EXPERIENCE",
    projects: "RELEVANT PROJECTS",
    skills: "SKILLS",
    training: "TRAINING AND DEVELOPING SKILLS",
    certifications: "COURSES AND CERTIFICATIONS",
    education: "EDUCATION",
    languages: "LANGUAGES",
    interests: "INTERESTS",
    other: "ADDITIONAL INFORMATION",
  },
};

const SECTION_ORDER = ["profile", "specializations", "experience", "projects", "skills", "training", "certifications", "education", "languages", "interests", "other"];

function documentText(document) {
  const parts = [document.name, document.headline, ...document.contactLines].filter(Boolean);
  for (const section of document.sections) {
    parts.push("", section.heading);
    for (const block of section.blocks) {
      if (block.type === "entry") {
        parts.push([block.title, block.date].filter(Boolean).join(" | "), ...block.meta, ...block.bullets.map((line) => "• " + line));
      } else if (block.type === "row") parts.push(block.label + ": " + block.value);
      else parts.push(block.text);
    }
  }
  return parts.flat().filter((line, index, lines) => line || lines[index - 1]).join("\n").trim();
}

export function buildAdaptedResume(sourceText, result, targetLabel, language = "es", options = {}) {
  const parsed = reorganizeResume(sourceText);
  const matched = result.keywordMatch?.matched ?? [];
  const requestedTarget = explicitTarget(targetLabel);
  const grouped = new Map();
  const originalHeadings = new Map();
  for (const section of parsed.sections) {
    const current = grouped.get(section.kind) ?? [];
    current.push(...section.lines);
    grouped.set(section.kind, current);
    if (!originalHeadings.has(section.kind)) originalHeadings.set(section.kind, section.heading.replace(/\s*[-–—]\s*(?:continuacion|continuación|continued)$/i, ""));
  }

  const name = inferResumeName(sourceText, options.fileName ?? "", parsed.header);
  const headline = inferResumeHeadline(sourceText, requestedTarget, parsed.header, name);
  const profile = recoverProfileText(grouped.get("profile") ?? [], parsed.header, name, headline);
  grouped.set("profile", profile ? [profile] : []);

  const recoveredExperience = recoverExperienceBlocks(grouped.get("experience") ?? [], (value) => polishResumeBullet(value, language));
  if (recoveredExperience?.entries.length) {
    grouped.set("experience", []);
    grouped.set("experienceBlocks", recoveredExperience.entries);
    const recoveredSpecializations = specializationLines(recoveredExperience.leftovers);
    if (recoveredSpecializations.length) grouped.set("specializations", [...(grouped.get("specializations") ?? []), ...recoveredSpecializations]);
  }
  grouped.set("specializations", compactDelimitedLines(grouped.get("specializations") ?? []));
  const recoveredEducation = recoverEducationBlocks(grouped.get("education") ?? []);
  if (recoveredEducation) grouped.set("educationBlocks", recoveredEducation);

  const sections = [];
  for (const kind of SECTION_ORDER) {
    let lines = grouped.get(kind) ?? [];
    const recoveredBlocks = grouped.get(kind + "Blocks");
    if (!lines.length && !recoveredBlocks?.length) continue;
    if (kind === "experience" || kind === "projects") lines = prioritizeSectionLines(lines, matched, language);
    else lines = lines.map(normalizeResumeDates);
    let blocks = recoveredBlocks ?? sectionBlocks(kind, lines, language);
    if (kind === "skills") blocks = skillBlocks(lines, language);
    if (kind === "languages") blocks = languageBlocks(lines);
    if (kind === "interests") blocks = interestBlocks(lines);
    if (!blocks.length) continue;
    sections.push({
      kind,
      heading: SECTION_HEADINGS[language][kind],
      blocks,
    });
  }

  const document = {
    name,
    headline: headline || originalHeadline(parsed.header) || (language === "es" ? "CV profesional" : "Professional resume"),
    contactLines: extractResumeContacts(sourceText),
    sections,
  };
  return { ...document, plainText: documentText(document) };
}

export function adaptedVersionName(targetLabel, companyLabel = "", language = "es") {
  const target = cleanTarget(targetLabel, language).replace(/[<>:"/\\|?*]+/g, " ").replace(/\s+/g, " ").trim();
  const company = String(companyLabel ?? "").replace(/^(?:empresa|company|organizacion|organization)\s*:\s*/i, "").replace(/[<>:"/\\|?*]+/g, " ").replace(/\s+/g, " ").trim();
  return company && normalize(company) !== normalize(target)
    ? "CV - " + company + " - " + target
    : "CV - " + target;
}

export function adaptedVersionId(sourceText, versionName) {
  const value = sourceText + "::" + versionName;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
