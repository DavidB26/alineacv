const STOP_WORDS = new Set(`
  para como desde hasta entre sobre esta este estos estas una uno unos unas del las los con sin por que
  quien donde cuando cual sus tus nuestro nuestra muy mas cada debe tener sera son job work role team
  with from into your you our the and for are this that will have has their they them about using use
  company position candidate required requirements preferred experience years skills ability strong
  trabajo puesto empresa equipo experiencia anos habilidad habilidades requisitos candidato buscamos
  deseable responsable funciones nivel conocimientos conocimiento
`.trim().split(/\s+/));

const SECTION_PATTERNS = {
  profile: /\b(perfil|resumen|objetivo|summary|profile|objective|about)\b/i,
  experience: /\b(experiencia|trayectoria|empleo|experience|employment|work history)\b/i,
  education: /\b(educacion|formacion|estudios|education|academic)\b/i,
  skills: /\b(habilidades|competencias|tecnologias|skills|competencies|technologies|tools)\b/i,
};

const ACTION_VERBS = [
  "aumente", "alcance", "analice", "automatice", "construi", "coordine", "cree", "desarrolle",
  "disene", "gestione", "implemente", "lidere", "mejore", "negocie", "optimice", "reduje",
  "increased", "achieved", "analyzed", "automated", "built", "coordinated", "created", "developed",
  "designed", "grew", "implemented", "improved", "led", "managed", "optimized", "reduced",
];

const copy = {
  es: {
    verdicts: ["Prioridad alta", "Necesita ajustes", "Bien encaminado", "Muy buena base"],
    categories: ["Contacto", "Estructura", "Impacto", "Legibilidad", "Lectura ATS"],
    issues: {
      email: ["Falta un correo detectable", "Los reclutadores y el ATS necesitan identificar un correo de contacto.", "Añade un correo profesional en texto normal, no dentro de una imagen."],
      phone: ["Falta un teléfono detectable", "No encontramos un número con formato reconocible.", "Incluye código de país y evita separar los dígitos en varias líneas."],
      link: ["Añade LinkedIn o portafolio", "Un enlace profesional ayuda a validar experiencia y proyectos.", "Escribe la URL completa en la sección de contacto."],
      profile: ["Falta un perfil profesional", "El CV no presenta rápidamente tu especialidad y propuesta de valor.", "Añade 3–5 líneas con experiencia, especialidad y principal aporte."],
      experience: ["La experiencia no está claramente identificada", "Los encabezados creativos pueden dificultar la clasificación automática.", "Usa el título estándar “Experiencia profesional”."],
      education: ["La educación no está claramente identificada", "El ATS podría no reconocer tu formación académica.", "Usa el título estándar “Educación” o “Formación académica”."],
      skills: ["Falta una sección de habilidades", "Las competencias separadas facilitan la coincidencia con vacantes.", "Agrupa herramientas y habilidades técnicas con nombres concretos."],
      dates: ["Revisa las fechas de experiencia", "Encontramos pocas fechas reconocibles para ordenar tu trayectoria.", "Usa formatos simples como “Mar 2022 — Actualidad”."],
      metrics: ["Tus logros necesitan resultados medibles", "Las responsabilidades sin cifras comunican menos impacto.", "Añade porcentajes, tiempos, ahorros, ingresos, usuarios o volúmenes."],
      verbs: ["Usa verbos de acción", "Las frases parecen describir tareas, pero no muestran suficiente iniciativa.", "Empieza cada logro con verbos como “Lideré”, “Optimicé” o “Implementé”."],
      bullets: ["Separa mejor los logros", "Los bloques largos son más difíciles de revisar para personas y sistemas.", "Usa una viñeta o una línea independiente por logro."],
      short: ["El CV tiene poco contenido", "El texto extraído es demasiado breve para explicar tu experiencia.", "Amplía logros, proyectos, formación y habilidades relevantes."],
      long: ["El CV es demasiado extenso", "Demasiado contenido diluye las palabras clave y los resultados importantes.", "Recorta tareas repetidas y prioriza los últimos 10–15 años."],
      firstPerson: ["Reduce la primera persona", "Expresiones como “yo” o “mi” ocupan espacio sin aportar evidencia.", "Redacta logros directamente: “Aumenté ventas…” en lugar de “Yo fui responsable…”."],
      extraction: ["La lectura del archivo es limitada", "El texto contiene caracteres extraños o poca estructura recuperable.", "Exporta nuevamente el CV como PDF con texto seleccionable y evita capturas escaneadas."],
    },
    strengths: {
      contact: "Los datos de contacto principales son detectables.",
      structure: "Las secciones usan encabezados fáciles de reconocer.",
      metrics: "Incluyes resultados cuantificables que demuestran impacto.",
      verbs: "Los logros utilizan verbos de acción.",
      length: "La extensión del contenido es adecuada para una revisión rápida.",
      match: "Tu CV cubre buena parte de las palabras clave de la vacante.",
    },
  },
  en: {
    verdicts: ["High priority", "Needs improvement", "On the right track", "Strong foundation"],
    categories: ["Contact", "Structure", "Impact", "Readability", "ATS parsing"],
    issues: {
      email: ["No detectable email", "Recruiters and ATS tools need to identify a contact email.", "Add a professional email as plain text, not inside an image."],
      phone: ["No detectable phone number", "We could not find a number in a recognizable format.", "Include the country code and keep the digits on one line."],
      link: ["Add LinkedIn or a portfolio", "A professional link helps validate your experience and projects.", "Write the full URL in the contact section."],
      profile: ["Professional summary is missing", "The resume does not quickly explain your specialty and value.", "Add 3–5 lines covering experience, specialty and strongest contribution."],
      experience: ["Experience is not clearly labeled", "Creative headings can make automatic classification harder.", "Use the standard heading “Professional experience”."],
      education: ["Education is not clearly labeled", "The ATS may fail to identify your academic background.", "Use the standard heading “Education”."],
      skills: ["Skills section is missing", "A dedicated list improves matching against job requirements.", "Group tools and technical skills using specific names."],
      dates: ["Review experience dates", "We found too few recognizable dates to order your career history.", "Use simple formats such as “Mar 2022 — Present”."],
      metrics: ["Your achievements need measurable results", "Responsibilities without numbers communicate less impact.", "Add percentages, time saved, revenue, users or volume."],
      verbs: ["Use stronger action verbs", "The content describes tasks without showing enough ownership.", "Start achievements with verbs such as “Led”, “Optimized” or “Implemented”."],
      bullets: ["Separate achievements more clearly", "Long blocks are harder for people and systems to scan.", "Use one bullet or separate line for each achievement."],
      short: ["The resume needs more content", "The extracted text is too short to explain your experience.", "Expand relevant achievements, projects, education and skills."],
      long: ["The resume is too long", "Excess content dilutes important keywords and outcomes.", "Remove repeated duties and prioritize the last 10–15 years."],
      firstPerson: ["Reduce first-person language", "Words such as “I” and “my” take space without adding evidence.", "State achievements directly: “Increased sales…” instead of “I was responsible…”."],
      extraction: ["File parsing is limited", "The text contains unusual characters or little recoverable structure.", "Export the resume again as a text-based PDF and avoid scanned screenshots."],
    },
    strengths: {
      contact: "Your main contact details are detectable.",
      structure: "The sections use headings that are easy to recognize.",
      metrics: "You include measurable outcomes that demonstrate impact.",
      verbs: "Achievements use clear action verbs.",
      length: "The content length supports a quick review.",
      match: "Your resume covers a strong share of the job keywords.",
    },
  },
};

function normalize(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function countMatches(text, expressions) {
  return expressions.reduce((total, expression) => total + (text.match(expression)?.length ?? 0), 0);
}

function keywordList(value) {
  const frequencies = new Map();
  for (const token of normalize(value).match(/[a-z][a-z0-9+#.-]{2,}/g) ?? []) {
    const cleaned = token.replace(/^[.-]+|[.-]+$/g, "");
    if (cleaned.length < 4 || STOP_WORDS.has(cleaned)) continue;
    frequencies.set(cleaned, (frequencies.get(cleaned) ?? 0) + 1);
  }

  return [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 18)
    .map(([word]) => word);
}

function issue(language, key, severity = "warning") {
  const [title, detail, suggestion] = copy[language].issues[key];
  return { id: key, severity, title, detail, suggestion };
}

export function analyzeResume(sourceText, jobDescription = "", language = "es") {
  const text = sourceText.split(String.fromCharCode(0)).join(" ").replace(/[ \t]+/g, " ").trim();
  const plain = normalize(text);
  const words = (plain.match(/[a-z0-9+#.-]+/g) ?? []).map((word) => word.replace(/^[.-]+|[.-]+$/g, "")).filter(Boolean);
  const wordCount = words.length;
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const hasEmail = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(text);
  const hasPhone = (text.match(/(?:\+?\d[\d\s().-]{6,}\d)/g) ?? []).some((candidate) => {
    const digits = candidate.replace(/\D/g, "").length;
    return digits >= 9 && digits <= 15;
  });
  const hasLink = /linkedin|https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|dev|pe|co)\b/i.test(text);
  const sections = Object.fromEntries(Object.entries(SECTION_PATTERNS).map(([key, pattern]) => [key, pattern.test(plain)]));
  const sectionCount = Object.values(sections).filter(Boolean).length;
  const dateCount = countMatches(plain, [/\b(?:19|20)\d{2}\b/g, /\b(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec|actualidad|presente|present)\b/g]);
  const actionCount = ACTION_VERBS.reduce((total, verb) => total + (plain.includes(verb) ? 1 : 0), 0);
  const metricCount = countMatches(plain, [/%/g, /[$€£]\s?\d/g, /\b\d+(?:[.,]\d+)?\s?(?:por ciento|percent|mil|k|millon|million|usuarios|users|clientes|clients|leads|ventas|sales|ingresos|revenue|ahorro|saved|horas|hours)\b/g]);
  const bulletCount = lines.filter((line) => /^[-•*▪‣]/.test(line)).length;
  const firstPersonCount = countMatches(plain, [/\b(?:yo|mio|mia|mi|i|my|mine)\b/g]);
  const unusualCount = text.replace(/[\p{L}\p{N}\s.,;:!?@%+&/()#'’"–—-]/gu, "").length;
  const cleanRatio = text.length ? 1 - unusualCount / text.length : 0;

  const contactScore = (hasEmail ? 6 : 0) + (hasPhone ? 5 : 0) + (hasLink ? 4 : 0);
  const structureScore = (sections.experience ? 7 : 0) + (sections.education ? 5 : 0) + (sections.skills ? 6 : 0) + (sections.profile ? 4 : 0) + (dateCount >= 2 ? 3 : 0);
  const impactScore = (metricCount ? 10 : 0) + (actionCount >= 3 ? 8 : actionCount ? 4 : 0) + (bulletCount >= 3 ? 7 : bulletCount ? 4 : 0);
  const readabilityScore = (wordCount >= 250 && wordCount <= 900 ? 8 : wordCount >= 150 && wordCount <= 1200 ? 4 : 0) + (firstPersonCount <= 2 ? 4 : 0) + (cleanRatio > 0.98 ? 4 : 0) + (lines.length >= 12 ? 4 : 0);
  const parsingScore = (wordCount >= 120 ? 5 : 0) + (sectionCount >= 3 ? 5 : sectionCount >= 2 ? 3 : 0) + (wordCount >= 200 && wordCount <= 1000 ? 5 : wordCount >= 120 ? 3 : 0);
  const score = Math.max(0, Math.min(100, contactScore + structureScore + impactScore + readabilityScore + parsingScore));

  const issues = [];
  if (!hasEmail) issues.push(issue(language, "email", "critical"));
  if (!hasPhone) issues.push(issue(language, "phone"));
  if (!hasLink) issues.push(issue(language, "link"));
  if (!sections.profile) issues.push(issue(language, "profile"));
  if (!sections.experience) issues.push(issue(language, "experience", "critical"));
  if (!sections.education) issues.push(issue(language, "education"));
  if (!sections.skills) issues.push(issue(language, "skills", "critical"));
  if (dateCount < 2) issues.push(issue(language, "dates"));
  if (!metricCount) issues.push(issue(language, "metrics"));
  if (actionCount < 2) issues.push(issue(language, "verbs"));
  if (bulletCount < 2 && lines.length > 8) issues.push(issue(language, "bullets"));
  if (wordCount < 180) issues.push(issue(language, "short", wordCount < 80 ? "critical" : "warning"));
  if (wordCount > 1100) issues.push(issue(language, "long"));
  if (firstPersonCount > 4) issues.push(issue(language, "firstPerson"));
  if (cleanRatio < 0.97) issues.push(issue(language, "extraction", "critical"));

  const strengths = [];
  if (hasEmail && hasPhone) strengths.push(copy[language].strengths.contact);
  if (sectionCount >= 3) strengths.push(copy[language].strengths.structure);
  if (metricCount) strengths.push(copy[language].strengths.metrics);
  if (actionCount >= 3) strengths.push(copy[language].strengths.verbs);
  if (wordCount >= 250 && wordCount <= 900) strengths.push(copy[language].strengths.length);

  const jobKeywords = keywordList(jobDescription);
  const resumeWords = new Set(words);
  const matched = jobKeywords.filter((keyword) => resumeWords.has(keyword));
  const missing = jobKeywords.filter((keyword) => !resumeWords.has(keyword));
  const matchScore = jobKeywords.length ? Math.round((matched.length / jobKeywords.length) * 100) : null;
  if (matchScore !== null && matchScore >= 70) strengths.push(copy[language].strengths.match);

  const verdictIndex = score >= 80 ? 3 : score >= 65 ? 2 : score >= 50 ? 1 : 0;

  return {
    score,
    verdict: copy[language].verdicts[verdictIndex],
    categories: [
      { label: copy[language].categories[0], score: contactScore, maximum: 15 },
      { label: copy[language].categories[1], score: structureScore, maximum: 25 },
      { label: copy[language].categories[2], score: impactScore, maximum: 25 },
      { label: copy[language].categories[3], score: readabilityScore, maximum: 20 },
      { label: copy[language].categories[4], score: parsingScore, maximum: 15 },
    ],
    issues,
    strengths,
    metrics: { wordCount, sectionCount, metricCount, actionCount },
    keywordMatch: jobKeywords.length ? { score: matchScore, matched, missing } : null,
  };
}
