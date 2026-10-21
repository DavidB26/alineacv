import { normalizeResumeDates } from './resume-dates.mjs';

function plain(value) { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
const EXPERIENCE = /^(?:experiencia(?: profesional| laboral)?|trayectoria profesional|professional experience|work experience|employment|work history)(?:\s*[-–—]\s*(?:continuacion|continued))?$/i;
const NEXT_SECTION = /^(?:educacion|formacion(?: academica| profesional complementaria| complementaria)?|estudios|habilidades(?: tecnicas| blandas)?|competencias(?: tecnicas)?|software(?: y herramientas| skills?)?|certificaciones|cursos|idiomas?|proyectos(?: relevantes)?|intereses|contacto|education|skills|soft skills|certifications|languages|projects|interests|contact)$/i;
const RANGE = /\b(?:(\d{1,2})\/)?((?:19|20)\d{2})\s*[-–—]\s*(?:(?:(\d{1,2})\/)?((?:19|20)\d{2})|(actualidad|presente|present|current))/gi;

// Sum the union of employment intervals, never the span between the first and
// last job: gaps and simultaneous jobs must not inflate experience.
export function employmentDuration(sourceText, asOf = new Date()) {
  const lines = String(sourceText).split(/\r?\n/);
  let active = false;
  const work = [];
  for (const line of lines) {
    const normalized = plain(line).trim().replace(/:$/, '');
    if (EXPERIENCE.test(normalized)) { active = true; continue; }
    if (NEXT_SECTION.test(normalized)) active = false;
    if (active) work.push(normalizeResumeDates(line));
  }
  const text = work.join('\n');
  const now = asOf.getUTCFullYear() * 12 + asOf.getUTCMonth();
  const ranges = [...text.matchAll(RANGE)].map(match => {
    const start = Number(match[2]) * 12 + (match[1] ? Number(match[1]) - 1 : 0);
    const end = match[5] ? now : Number(match[4]) * 12 + (match[3] ? Number(match[3]) - 1 : 0);
    return { start, end: Math.min(end, now), label: match[0], approximate: !match[1] || (!match[5] && !match[3]) };
  }).filter(range => range.start <= range.end && range.start <= now)
    .sort((a, b) => a.start - b.start);
  const merged = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  const months = merged.reduce((sum, range) => sum + range.end - range.start, 0);
  return { months, years: Math.floor(months / 12), ranges, approximate: ranges.some(range => range.approximate), text };
}
