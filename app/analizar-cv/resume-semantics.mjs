function plain(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function clean(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = plain(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const GENERIC_LABEL = /^(?:curriculum(?: vitae)?|cv|resume|hoja de vida|contacto|perfil(?: profesional)?|sobre mi)$/i;
const PROFESSION = /\b(?:abogad|arquitect|diseñ|designer|ingenier|contador|m[eé]dic|enfermer|psic[oó]log|administrad|analist|desarroll|program|docent|profesor|comunicad|publicist|periodist|fot[oó]graf|chef|t[eé]cnic|especialist|consultor|gerent|director|creador|marketing|ventas|recursos humanos)\w*/i;
const SECTION_WORDS = /\b(?:experiencia|educaci[oó]n|formaci[oó]n|habilidades|software|idiomas?|lenguaje|hobbies|intereses|proyectos?|contacto)\b/i;
const CONTACT_LIKE = /@|https?:\/\/|www\.|linkedin|behance|portfolio|portafolio/i;
const DATE_PATTERN = /((?:0?[1-9]|1[0-2])\/(?:19|20)\d{2}|(?:19|20)\d{2})(?:\s*[-–—]\s*(?:(?:0?[1-9]|1[0-2])\/(?:19|20)\d{2}|(?:19|20)\d{2}|presente|actualidad|present))?/i;

function titleCaseName(value) {
  return clean(value).toLowerCase().replace(/(^|[\s'-])([\p{L}])/gu, (_, before, letter) => before + letter.toUpperCase());
}

function plausibleName(value) {
  const text = clean(value).replace(/[|•]/g, " ");
  const words = text.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 6
    && !GENERIC_LABEL.test(text)
    && !SECTION_WORDS.test(text)
    && !PROFESSION.test(text)
    && !CONTACT_LIKE.test(text)
    && !/\d|[/,:]/.test(text)
    && words.every((word) => /^[\p{L}.''-]+$/u.test(word));
}

function nameFromFile(fileName) {
  const candidate = clean(fileName)
    .replace(/\.(?:pdf|docx)$/i, "")
    .replace(/^\s*(?:cv|curriculum(?: vitae)?|resume)[\s_-]*/i, "")
    .replace(/\s*\(\d+\)\s*$/g, "")
    .replace(/[\s_-]*(?:19|20)\d{2}\s*$/g, "")
    .replace(/[_-]+/g, " ");
  return plausibleName(candidate) ? titleCaseName(candidate) : "";
}

export function inferResumeName(sourceText, fileName = "", header = []) {
  const explicit = clean(sourceText).match(/\bmi nombre es\s+([\p{L}][\p{L}.'-]*(?:\s+[\p{L}][\p{L}.'-]*){1,5})(?=\s*(?:\.|,|tengo\b|y soy\b))/iu)?.[1];
  if (explicit && plausibleName(explicit)) return titleCaseName(explicit.replace(/[.,;:]+$/, ""));
  const fromFile = nameFromFile(fileName);
  if (fromFile) return fromFile;
  const fromHeader = header.find(plausibleName);
  if (fromHeader) return titleCaseName(fromHeader);
  const introduction = clean(sourceText).match(/\bsoy\s+([\p{Lu}][\p{L}.'-]+)(?:[!.,]|\s+y\b)/u)?.[1];
  return introduction ? titleCaseName(introduction) : "CV profesional";
}

export function plausibleTarget(value) {
  const text = clean(value).replace(/^(?:puesto|vacante|cargo|position|role|job)\s*:\s*/i, "");
  if (!text || text.length > 82 || text.split(/\s+/).length > 12) return "";
  if ((text.match(/,/g) ?? []).length > 1 || /^(?:convocatoria|vacante|job description|requisitos|requirements)\b/i.test(text)) return "";
  return text;
}

function normalizeProfessionalHeadline(value) {
  const text = clean(value)
    .replace(/^(?:soy|i am)\s+/i, "")
    .replace(/\s+(?:y actualmente|actualmente|con m[aá]s de|con experiencia|que actualmente)\b.*$/i, "")
    .replace(/[.,;:]+$/, "")
    .trim();
  if (!text || !PROFESSION.test(text)) return "";
  return text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
}

export function inferResumeHeadline(sourceText, requestedTarget = "", header = [], name = "") {
  const headerCandidate = header.find((line) => plain(line) !== plain(name) && PROFESSION.test(line) && !CONTACT_LIKE.test(line));
  if (headerCandidate) {
    const normalized = normalizeProfessionalHeadline(headerCandidate);
    if (normalized) return normalized;
  }
  const matches = [...clean(sourceText).matchAll(/\bsoy\s+([^.;]{3,100})/giu)].map((match) => match[1]);
  const professional = matches.find((value) => PROFESSION.test(value));
  if (professional) {
    const normalized = normalizeProfessionalHeadline(professional);
    if (normalized) return normalized;
  }
  const target = plausibleTarget(requestedTarget);
  if (target) return target;
  const fallback = header.find((line) => plausibleTarget(line) && plain(line) !== plain(name) && !CONTACT_LIKE.test(line) && !GENERIC_LABEL.test(line));
  return normalizeProfessionalHeadline(fallback) || fallback || "CV profesional";
}

export function extractResumeContacts(sourceText) {
  const text = clean(sourceText);
  const emails = [...text.matchAll(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g)].map((match) => match[0]);
  const urls = [...text.matchAll(/(?:https?:\/\/|www\.)[^\s|]+|\b(?:linkedin\.com|behance\.net)\/[^\s|]+/gi)].map((match) => match[0].replace(/[.,;]+$/, ""));
  const sourceLines = sourceText.split(/\r?\n/).map(clean);
  const phones = sourceLines.flatMap((line) => [...line.matchAll(/(?:\+?\d[\d \t().-]{7,}\d)/g)].map((match) => clean(match[0])))
    .filter((value) => value.replace(/\D/g, "").length >= 9 && !/^(?:19|20)\d{2}\s*[-–—]/.test(value));
  const locations = sourceLines.filter((line) => {
    if (!/^[\p{L} .'-]{2,35},\s*[\p{L} .'-]{2,35}$/u.test(line) || PROFESSION.test(line)) return false;
    const parts = line.split(",").map((part) => part.trim().split(/\s+/).length);
    return line.length <= 45 && parts[0] <= 3 && parts[1] <= 3;
  });
  return unique([...phones, ...emails, ...locations, ...urls]);
}

export function recoverProfileText(profileLines, header, name, headline) {
  const explicit = unique(profileLines.map(clean).filter(Boolean));
  if (explicit.length) return explicit.join(" ");
  const normalizedHeader = header.map(clean);
  const start = normalizedHeader.findIndex((line) => line.split(/\s+/).length >= 5 || PROFESSION.test(line));
  const candidates = (start >= 0 ? normalizedHeader.slice(start) : normalizedHeader).filter((line) =>
    line
    && plain(line) !== plain(name)
    && plain(line) !== plain(headline)
    && !GENERIC_LABEL.test(line)
    && !CONTACT_LIKE.test(line)
    && !/^hola[,!]?$/i.test(line));
  return candidates.join(" ").replace(/^soy\s+[\p{Lu}][\p{L}.'-]+[!.]?\s*/u, "").trim();
}

export function dateParts(value) {
  const text = clean(value);
  const match = text.match(DATE_PATTERN);
  if (!match) return null;
  return {
    date: match[0].replace(/\s*[-–—]\s*/g, " - "),
    before: clean(text.slice(0, match.index)),
    after: clean(text.slice((match.index ?? 0) + match[0].length)),
  };
}

function looksDescription(value) {
  return /^(?:encargad[oa] de|responsable de|realizar|crear|diseñar|desarrollar|gestionar|mantener|coordinar|implementar|participar|apoyar|elaborar|analizar)\b/i.test(clean(value)) || clean(value).split(/\s+/).length >= 10;
}

function looksSpecialization(value) {
  const text = clean(value);
  return text.length <= 70 && !DATE_PATTERN.test(text) && !CONTACT_LIKE.test(text)
    && /^(?:packaging|branding|ilustraci[oó]n|identidad visual|direcci[oó]n de arte|fotograf[ií]a|ux(?:\/ui)?|ui(?:\/ux)?)(?:\s+(?:packaging|branding|ilustraci[oó]n|identidad visual|direcci[oó]n de arte|fotograf[ií]a|ux(?:\/ui)?|ui(?:\/ux)?))*$/i.test(text);
}

function experienceTitle(parts) {
  if (!parts.length) return "Experiencia profesional";
  if (parts.length === 1) return parts[0];
  const roleIndex = parts.findIndex((part) => PROFESSION.test(part));
  if (roleIndex >= 0) {
    const role = parts[roleIndex];
    const company = parts.filter((_, index) => index !== roleIndex).join(" | ");
    return company ? `${role} | ${company}` : role;
  }
  return parts.join(" | ");
}

export function recoverExperienceBlocks(lines, polish) {
  if (lines.some((line) => /^(?:[-•*▪‣]|\(cid:\d+\))\s*/.test(line))) return null;
  const source = lines.map(clean).filter(Boolean);
  const entries = [];
  const leftovers = [];
  let pending = [];
  let current = null;

  const push = () => {
    if (!current) return;
    const bullet = clean(current.bulletParts.join(" "));
    entries.push({ type: "entry", title: current.title, date: current.date, meta: [], bullets: bullet ? [polish(bullet)] : [] });
    current = null;
  };

  for (let index = 0; index < source.length; index += 1) {
    const line = source[index];
    if (CONTACT_LIKE.test(line) || /^(?:tel[eé]fono|email)$/i.test(line)) continue;
    if (looksSpecialization(line)) {
      push();
      leftovers.push(line);
      continue;
    }
    const dated = dateParts(line);
    if (dated) {
      push();
      const attached = dated.after || dated.before;
      if (attached && looksDescription(attached)) {
        current = { title: experienceTitle(pending), date: dated.date, bulletParts: [attached] };
      } else {
        const titleParts = [...pending, attached].filter(Boolean);
        current = { title: experienceTitle(titleParts), date: dated.date, bulletParts: [] };
        if (!looksDescription(source[index + 1] ?? "")) push();
      }
      pending = [];
      continue;
    }
    const nextDated = dateParts(source[index + 1] ?? "");
    if (current) {
      if (nextDated && !looksDescription(line)) {
        push();
        pending = [line];
      } else current.bulletParts.push(line);
      continue;
    }
    pending.push(line);
  }
  push();
  if (pending.length) leftovers.push(...pending);
  return { entries, leftovers };
}

export function recoverEducationBlocks(lines) {
  if (lines.some((line) => /^(?:[-•*▪‣]|\(cid:\d+\))\s*/.test(line))) return null;
  const source = lines.map(clean).filter((line) => line && !CONTACT_LIKE.test(line));
  const entries = [];
  let pending = [];
  for (const line of source) {
    const dated = dateParts(line);
    if (!dated) {
      pending.push(line);
      continue;
    }
    const detail = dated.before || dated.after;
    const title = pending.shift() || detail || "Formación";
    const meta = [...pending, ...(detail && plain(detail) !== plain(title) ? [detail] : [])];
    entries.push({ type: "entry", title, date: dated.date, meta, bullets: [] });
    pending = [];
  }
  if (pending.length) entries.push({ type: "entry", title: pending.shift(), date: "", meta: pending, bullets: [] });
  return entries.length ? entries : null;
}

const TOOL_PATTERN = /\b(?:adobe|photoshop|illustrator|indesign|after effects|3d max|figma|procreate|autocad|revit|sketchup|office|excel|word|powerpoint|javascript|typescript|react|angular|vue|java|python|php|sql|mysql|wordpress|contentstack|selenium|git|svn)\b/i;

function canonicalTool(value) {
  return clean(value).replace(/^app\s+/i, "").replace(/Adobe Indesign/i, "Adobe InDesign").replace(/Adobe photoshop/i, "Adobe Photoshop");
}

export function skillBlocks(lines, language = "es") {
  const grouped = new Map();
  const tools = [];
  const competencies = [];
  for (const original of lines.map(clean).filter(Boolean)) {
    if (CONTACT_LIKE.test(original) || /^(?:tel[eé]fono|email|behance porta)$/i.test(original)) continue;
    const segments = original.split("|").map(clean).filter(Boolean);
    let activeLabel = "";
    let categorized = false;
    for (const segment of segments) {
      const labeled = segment.match(/^([^:]{2,42}):\s*(.+)$/);
      if (labeled) {
        activeLabel = clean(labeled[1]);
        const current = grouped.get(activeLabel) ?? [];
        current.push(canonicalTool(labeled[2]));
        grouped.set(activeLabel, current);
        categorized = true;
      } else if (activeLabel) {
        grouped.get(activeLabel).push(canonicalTool(segment));
        categorized = true;
      }
    }
    if (categorized) continue;
    if (TOOL_PATTERN.test(original) && !original.includes(" - ")) tools.push(canonicalTool(original));
    else competencies.push(original.replace(/\s*-\s*/g, ", ").replace(/,\s*$/, ""));
  }
  const blocks = [...grouped.entries()].map(([label, values]) => ({ type: "row", label, value: unique(values).join(" | ") }));
  if (tools.length) blocks.push({ type: "row", label: language === "es" ? "Herramientas" : "Tools", value: unique(tools).join(" | ") });
  if (competencies.length) blocks.push({ type: "row", label: language === "es" ? "Competencias" : "Strengths", value: unique(competencies).join(" | ") });
  return blocks;
}

export function languageBlocks(lines) {
  return unique(lines.map(clean).filter(Boolean)).map((line) => {
    const match = line.match(/^(español|ingl[eé]s|franc[eé]s|portugu[eé]s|alem[aá]n|italiano|quechua)\s*[:|-]?\s*(.*)$/i);
    return match && match[2] ? { type: "row", label: match[1], value: match[2] } : { type: "paragraph", text: line };
  });
}

export function interestBlocks(lines) {
  const values = unique(lines.map(clean).filter(Boolean));
  return values.length ? [{ type: "paragraph", text: values.join(" | ") }] : [];
}

export function specializationLines(lines) {
  const values = [];
  for (const line of lines) {
    if (/^packaging\s+ilustraci[oó]n$/i.test(clean(line))) values.push("Packaging", "Ilustración");
    else values.push(clean(line));
  }
  return unique(values);
}
