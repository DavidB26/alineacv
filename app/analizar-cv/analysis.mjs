const STOP_WORDS = new Set(`
  para como desde hasta entre sobre esta este estos estas una uno unos unas del las los con sin por que
  quien donde cuando cual sus tus nuestro nuestra muy mas cada debe tener tienes dominas sera son lugar
  buscamos ofrecemos ofrecemos unete unirte formar parte oportunidad responsabilidades principales
  quien donde cuando buscamos buscamos job work role team
  with from into your you our the and for are this that will have has their they them about using use
  company position candidate required requirements preferred experience years skills ability strong
  looking join joining opportunity responsibilities responsibilities duties main place must should
  trabajo puesto empresa equipo experiencia anos habilidad habilidades requisitos candidato buscamos
  deseable responsable funciones nivel conocimientos conocimiento consumiendo dominio dominar
`.trim().split(/\s+/));

const REQUIREMENT_GROUPS = [
  ["JavaScript", ["javascript", "java script", "js"]],
  ["TypeScript", ["typescript"]],
  ["React", ["react", "reactjs", "react.js"]],
  ["Angular", ["angular", "angularjs"]],
  ["Vue 2", ["vue 2", "vue2"]],
  ["Vue 3", ["vue 3", "vue3"]],
  ["Vue.js", ["vue", "vuejs", "vue.js"]],
  ["Vuex", ["vuex"]],
  ["Pinia", ["pinia"]],
  ["Next.js", ["next.js", "nextjs"]],
  ["Node.js", ["node.js", "nodejs"]],
  ["HTML", ["html", "html5"]],
  ["CSS", ["css", "css3"]],
  ["Sass", ["sass", "scss"]],
  ["Tailwind CSS", ["tailwind", "tailwindcss", "tailwind css"]],
  ["Bootstrap", ["bootstrap"]],
  ["Responsive Design", ["responsive design", "diseno responsive", "interfaces responsive", "responsive"]],
  ["Python", ["python"]],
  ["Java", ["java"]],
  ["C#", ["c#", "c sharp"]],
  [".NET", [".net", "dotnet"]],
  ["C++", ["c++"]],
  ["PHP", ["php"]],
  ["Laravel", ["laravel"]],
  ["Ruby", ["ruby"]],
  ["Ruby on Rails", ["ruby on rails", "rails"]],
  ["Go", ["golang"]],
  ["Kotlin", ["kotlin"]],
  ["Swift", ["swift"]],
  ["SQL", ["sql"]],
  ["MySQL", ["mysql"]],
  ["PostgreSQL", ["postgresql", "postgres"]],
  ["SQL Server", ["sql server", "mssql"]],
  ["MongoDB", ["mongodb", "mongo db"]],
  ["Redis", ["redis"]],
  ["Firebase", ["firebase"]],
  ["AWS", ["aws", "amazon web services"]],
  ["Azure", ["azure", "microsoft azure"]],
  ["Google Cloud", ["google cloud", "gcp"]],
  ["Docker", ["docker"]],
  ["Kubernetes", ["kubernetes", "k8s"]],
  ["Git", ["git"]],
  ["GitHub", ["github"]],
  ["Sourcetree", ["sourcetree"]],
  ["CI/CD", ["ci/cd", "ci", "cd", "continuous integration", "continuous delivery"]],
  ["API", ["api", "apis"]],
  ["REST", ["rest", "restful"]],
  ["GraphQL", ["graphql"]],
  ["Testing", ["testing", "pruebas automatizadas", "pruebas unitarias", "unit testing", "unit tests", "automated testing"]],
  ["Code review", ["code review", "revision de codigo", "revisiones de codigo"]],
  ["Arquitectura frontend escalable", ["arquitectura frontend escalable", "arquitecturas frontend escalables", "componentes reutilizables", "componentes responsive y reutilizables", "reutilizables", "reusable components", "scalable frontend architecture"]],
  ["WordPress", ["wordpress"]],
  ["Elementor", ["elementor"]],
  ["Divi", ["divi", "divi builder"]],
  ["Temas WordPress personalizados", ["temas wordpress personalizados", "desarrollo de temas wordpress", "temas y plugins personalizados", "custom wordpress themes", "wordpress theme development"]],
  ["Plugins WordPress personalizados", ["plugins wordpress personalizados", "plugins personalizados", "personalizacion de plugins", "personalizar plugins", "temas y plugins personalizados", "custom wordpress plugins", "wordpress plugin development"]],
  ["Seguridad WordPress", ["seguridad wordpress", "seguridad para wordpress", "seguridad de wordpress", "wordpress security", "wordpress hardening", "hardening de wordpress"]],
  ["Drupal", ["drupal"]],
  ["Figma", ["figma"]],
  ["Adobe Photoshop", ["photoshop", "adobe photoshop"]],
  ["Adobe Illustrator", ["illustrator", "adobe illustrator"]],
  ["Adobe InDesign", ["indesign", "adobe indesign"]],
  ["Adobe XD", ["adobe xd"]],
  ["Adobe After Effects", ["after effects", "adobe after effects"]],
  ["Blender", ["blender"]],
  ["Procreate", ["procreate"]],
  ["Contentstack", ["contentstack"]],
  ["Branding", ["branding", "brand design", "diseno de marca"]],
  ["Ilustración", ["ilustracion", "illustration"]],
  ["Publicidad", ["publicidad", "advertising"]],
  ["Edición de video", ["edicion de video", "video editing"]],
  ["Diseño web", ["diseno web", "web design"]],
  ["UI/UX", ["ui/ux", "ux/ui", "ui", "ux", "user experience", "user interface"]],
  ["QA", ["quality assurance", "qa"]],
  ["Selenium", ["selenium"]],
  ["Cypress", ["cypress"]],
  ["Power BI", ["power bi", "powerbi"]],
  ["Business Intelligence", ["business intelligence", "conceptos bi", "bi"]],
  ["Dashboards y KPIs", ["dashboards", "dashboard", "kpis", "kpi", "drill-down", "drill down"]],
  ["Datos gobernados", ["datos gobernados", "governed data"]],
  ["Tableau", ["tableau"]],
  ["Excel", ["excel", "microsoft excel"]],
  ["SAP", ["sap"]],
  ["Oracle", ["oracle"]],
  ["ERP", ["erp"]],
  ["Análisis de datos", ["analisis de datos", "data analysis", "data analytics"]],
  ["Machine Learning", ["machine learning", "aprendizaje automatico"]],
  ["Inteligencia artificial", ["inteligencia artificial", "artificial intelligence", "ia"]],
  ["Estadística", ["estadistica", "statistics"]],
  ["Marketing", ["marketing"]],
  ["Marketing de contenidos", ["marketing de contenidos", "content marketing"]],
  ["Email marketing", ["email marketing"]],
  ["SEO", ["seo", "search engine optimization"]],
  ["SEM", ["sem", "search engine marketing"]],
  ["Google Analytics", ["google analytics", "ga4"]],
  ["Google Ads", ["google ads", "adwords"]],
  ["Meta Ads", ["meta ads", "facebook ads"]],
  ["HubSpot", ["hubspot"]],
  ["Salesforce", ["salesforce"]],
  ["CRM", ["crm", "customer relationship management"]],
  ["E-commerce", ["ecommerce", "e-commerce", "comercio electronico"]],
  ["Campañas", ["campanas", "campaigns"]],
  ["Ventas", ["ventas", "sales"]],
  ["Negociación", ["negociacion", "negotiation"]],
  ["Gestión de proyectos", ["gestion de proyectos", "project management"]],
  ["Gestión de producto", ["gestion de producto", "product management"]],
  ["Agile", ["agile", "agil"]],
  ["Scrum", ["scrum"]],
  ["Jira", ["jira"]],
  ["Gestión de stakeholders", ["gestion de stakeholders", "stakeholder management"]],
  ["Contabilidad", ["contabilidad", "accounting"]],
  ["Análisis financiero", ["analisis financiero", "financial analysis"]],
  ["Presupuestos", ["presupuestos", "budgeting"]],
  ["NIIF/IFRS", ["niif", "ifrs"]],
  ["Impuestos", ["impuestos", "taxation", "taxes"]],
  ["Planillas", ["planillas", "payroll"]],
  ["Reclutamiento", ["reclutamiento", "recruitment", "recruiting"]],
  ["Selección de talento", ["seleccion de talento", "talent acquisition"]],
  ["Recursos humanos", ["recursos humanos", "human resources", "hr"]],
  ["Servicio al cliente", ["servicio al cliente", "customer service", "customer support"]],
  ["Soporte técnico", ["soporte tecnico", "technical support"]],
  ["Logística", ["logistica", "logistics"]],
  ["Cadena de suministro", ["cadena de suministro", "supply chain"]],
  ["Inventarios", ["inventarios", "inventory"]],
  ["Compras", ["compras", "procurement"]],
  ["Operaciones", ["operaciones", "operations"]],
  ["Enfermería", ["enfermeria", "nursing"]],
  ["Atención al paciente", ["atencion al paciente", "patient care"]],
  ["Derecho civil", ["derecho civil", "civil law"]],
  ["Derecho laboral", ["derecho laboral", "labor law", "employment law"]],
  ["Derecho corporativo", ["derecho corporativo", "corporate law"]],
  ["Derecho penal", ["derecho penal", "criminal law"]],
  ["Contratos", ["contratos", "contract drafting", "contract review", "contracts"]],
  ["Litigios", ["litigios", "litigacion", "litigation"]],
  ["Cumplimiento normativo", ["cumplimiento normativo", "compliance", "regulatory compliance"]],
  ["Investigación jurídica", ["investigacion juridica", "legal research"]],
  ["Redacción jurídica", ["redaccion juridica", "legal writing"]],
  ["Debida diligencia", ["debida diligencia", "due diligence"]],
  ["AutoCAD", ["autocad"]],
  ["Revit", ["revit"]],
  ["BIM", ["bim", "building information modeling"]],
  ["SketchUp", ["sketchup"]],
  ["Planos arquitectónicos", ["planos arquitectonicos", "architectural drawings"]],
  ["Diseño arquitectónico", ["diseno arquitectonico", "architectural design"]],
  ["Modelado 3D", ["modelado 3d", "diseno 3d", "3d modeling", "3d modelling", "3d design"]],
  ["Renderizado", ["renderizado", "rendering"]],
  ["Supervisión de obra", ["supervision de obra", "construction supervision", "site supervision"]],
  ["Presupuesto de obra", ["presupuesto de obra", "cost estimation", "construction budgeting"]],
  ["Diseño gráfico", ["diseno grafico", "graphic design"]],
  ["Identidad visual", ["identidad visual", "visual identity", "brand identity"]],
  ["Diseño editorial", ["diseno editorial", "editorial design"]],
  ["Prototipado", ["prototipado", "prototyping"]],
  ["Investigación de usuarios", ["investigacion de usuarios", "user research"]],
  ["Accesibilidad", ["accesibilidad", "accessibility"]],
  ["Gestión clínica", ["gestion clinica", "clinical management"]],
  ["Historia clínica", ["historia clinica", "medical records", "clinical records"]],
  ["Seguridad del paciente", ["seguridad del paciente", "patient safety"]],
  ["Protocolos clínicos", ["protocolos clinicos", "clinical protocols"]],
  ["Investigación", ["investigacion", "research"]],
  ["Docencia", ["docencia", "teaching"]],
  ["Redacción", ["redaccion", "writing", "copywriting"]],
  ["Gestión documental", ["gestion documental", "document management"]],
  ["Atención al detalle", ["atencion al detalle", "attention to detail", "controles de calidad", "control de calidad"]],
  ["Comunicación", ["comunicacion", "communication"]],
  ["Liderazgo", ["liderazgo", "leadership"]],
  ["Trabajo autónomo", ["trabajo autonomo", "forma autonoma", "autonomous work", "work independently", "independently", "freelance"]],
  ["Trabajo en equipo", ["trabajo en equipo", "trabajar en equipo", "autonomo y en equipo", "autonoma y en equipo", "forma autonoma y en equipo", "equipos multidisciplinarios", "teamwork", "cross-functional teams"]],
  ["Resolución de problemas", ["resolucion de problemas", "problem solving"]],
  ["Pensamiento analítico", ["pensamiento analitico", "analytical thinking"]],
  ["Inglés", ["ingles", "english"]],
  ["Portugués", ["portugues", "portuguese"]],
];

const SPECIAL_REQUIREMENTS = new Map([
  ["React o Angular", {
    label: "React o Angular",
    aliases: ["react", "reactjs", "react.js", "angular", "angularjs"],
  }],
  ["API REST", {
    label: "API REST",
    aliases: ["api rest", "apis rest", "rest api", "restful api", "restful services", "servicios rest"],
  }],
  ["Inglés C1", {
    label: "Inglés C1",
    aliases: ["ingles c1", "ingles: c1", "c1 avanzado", "ingles avanzado", "ingles: avanzado", "english c1", "advanced english"],
    projectable: false,
  }],
  ["Desarrollo asistido por IA", {
    label: "Desarrollo asistido por IA",
    aliases: ["desarrollo asistido por ia", "herramientas de desarrollo asistidas por ia", "github copilot", "chatgpt", "claude", "ai-assisted development", "ai assisted development"],
  }],
]);

const NON_PROJECT_REQUIREMENTS = new Set(["Inglés", "Portugués", "Inglés C1"]);

const SECTION_PATTERNS = {
  profile: /\b(perfil|resumen|objetivo|summary|profile|objective|about)\b/i,
  experience: /\b(experiencia|trayectoria|empleo|experience|employment|work history)\b/i,
  education: /\b(educacion|formacion|estudios|education|academic)\b/i,
  skills: /\b(habilidades|competencias|tecnologias|skills|competencies|technologies|tools)\b/i,
};

const ACTION_VERBS = [
  "aumentar", "alcanzar", "analizar", "automatizar", "construir", "coordinar", "crear", "desarrollar",
  "disenar", "gestionar", "implementar", "liderar", "mejorar", "negociar", "optimizar", "reducir",
  "aumente", "alcance", "analice", "automatice", "construi", "coordine", "cree", "desarrolle",
  "disene", "gestione", "implemente", "lidere", "mejore", "negocie", "optimice", "reduje",
  "increase", "achieve", "analyze", "automate", "build", "coordinate", "create", "develop",
  "design", "grow", "implement", "improve", "lead", "manage", "optimize", "reduce",
  "increased", "achieved", "analyzed", "automated", "built", "coordinated", "created", "developed",
  "designed", "grew", "implemented", "improved", "led", "managed", "optimized", "reduced",
];

const DIGIT_NUMBER = String.raw`\d+(?:[.,]\d+)?`;
const SPANISH_NUMBER_WORD = String.raw`(?:
  cero|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|
  diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|
  veinte|veintiuno|veintiuna|veintidos|veintitres|veinticuatro|veinticinco|veintiseis|veintisiete|veintiocho|veintinueve|
  (?:treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)(?:\s+y\s+(?:un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve))?|
  cien|ciento
)`.replace(/\s+/g, "");
const NUMBER_VALUE = `(?:${DIGIT_NUMBER}|${SPANISH_NUMBER_WORD})`;
const SPANISH_NUMBER_VALUES = new Map([
  ["cero", 0], ["un", 1], ["uno", 1], ["una", 1], ["dos", 2], ["tres", 3], ["cuatro", 4],
  ["cinco", 5], ["seis", 6], ["siete", 7], ["ocho", 8], ["nueve", 9], ["diez", 10],
  ["once", 11], ["doce", 12], ["trece", 13], ["catorce", 14], ["quince", 15],
  ["dieciseis", 16], ["diecisiete", 17], ["dieciocho", 18], ["diecinueve", 19], ["veinte", 20],
  ["veintiuno", 21], ["veintiuna", 21], ["veintidos", 22], ["veintitres", 23], ["veinticuatro", 24],
  ["veinticinco", 25], ["veintiseis", 26], ["veintisiete", 27], ["veintiocho", 28], ["veintinueve", 29],
  ["treinta", 30], ["cuarenta", 40], ["cincuenta", 50], ["sesenta", 60], ["setenta", 70],
  ["ochenta", 80], ["noventa", 90], ["cien", 100], ["ciento", 100],
]);

function numericValue(value) {
  const plain = normalize(value).trim();
  if (/^\d/.test(plain)) return Number(plain.replace(",", "."));
  if (SPANISH_NUMBER_VALUES.has(plain)) return SPANISH_NUMBER_VALUES.get(plain);
  const compound = plain.match(/^(treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\s+y\s+(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)$/);
  return compound ? SPANISH_NUMBER_VALUES.get(compound[1]) + SPANISH_NUMBER_VALUES.get(compound[2]) : Number.NaN;
}

function statedExperienceYears(text) {
  const patterns = [
    new RegExp(String.raw`(?:\+|mas de|al menos|minim[oa](?: de)?|minimum of|at least)?\s*(${NUMBER_VALUE})\s+(?:anos?|years?)(?:\s+de)?\s+experiencia`, "g"),
    new RegExp(String.raw`\bexperiencia(?:\s+minima)?(?:\s+de|\s+de al menos|\s+de mas de|\s+minimum of|\s+at least)?\s+(${NUMBER_VALUE})\s+(?:anos?|years?)`, "g"),
  ];
  return patterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => numericValue(match[1]))).filter(Number.isFinite);
}
const MEASURABLE_UNIT = String.raw`(?:
  por\s+ciento|percent|mil|k|millon(?:es)?|million(?:s)?|
  segundos?|seconds?|minutos?|minutes?|horas?|hours?|dias?|days?|semanas?|weeks?|meses?|months?|
  usuarios?|users?|clientes?|clients?|leads?|ventas?|sales|ingresos?|revenue|ahorros?|saved|
  solicitudes?|requests?|tickets?|proyectos?|projects?|procesos?|processes?|componentes?|components?|
  paginas?|pages?|equipos?|teams?|unidades?|units?
)`.replace(/\s+/g, "");
const METRIC_EXPRESSION = new RegExp([
  String.raw`\bde\s+${NUMBER_VALUE}\s+a\s+${NUMBER_VALUE}(?:\s+${MEASURABLE_UNIT})?\b`,
  String.raw`\b(?:el|la|al)\s+(?:doble|mitad)\b`,
  String.raw`[$€£]\s*${DIGIT_NUMBER}`,
  String.raw`\b${DIGIT_NUMBER}\s*%`,
  String.raw`\b${NUMBER_VALUE}\s+${MEASURABLE_UNIT}\b`,
].join("|"), "g");

const OUTCOME_EXPRESSIONS = [
  /\b(?:ahorro|crecimiento|conversion|eficiencia|impacto|mejora|reduccion|resultado|retencion|satisfaccion|saving|growth|conversion|efficiency|impact|improvement|reduction|result|retention|satisfaction)\w*\b/g,
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

function countMeasurableEvidence(value) {
  return value.match(METRIC_EXPRESSION)?.length ?? 0;
}

function hasTerm(value, term) {
  const haystack = normalize(value).replace(/\.(?=\s|$)/g, " ");
  const escaped = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}(?=$|[^a-z0-9+#.])`).test(haystack);
}

export function resumeSearchSkills(value) {
  return REQUIREMENT_GROUPS
    .filter(([, aliases]) => aliases.some((alias) => hasTerm(value, alias)))
    .map(([label]) => label)
    .join(", ")
    .slice(0, 500);
}

function keywordList(value) {
  const normalizedValue = normalize(value);
  let requirements = REQUIREMENT_GROUPS
    .filter(([, aliases]) => aliases.some((alias) => hasTerm(normalizedValue, alias)))
    .map(([label, aliases]) => ({ label, aliases, projectable: !NON_PROJECT_REQUIREMENTS.has(label) }));

  const replaceWithSpecial = (label, replacedLabels) => {
    const special = SPECIAL_REQUIREMENTS.get(label);
    requirements = requirements.filter((requirement) => !replacedLabels.includes(requirement.label));
    if (special && !requirements.some((requirement) => requirement.label === special.label)) requirements.push(special);
  };

  if (/\b(?:react\s+(?:o|or)\s+angular|angular\s+(?:o|or)\s+react)\b/.test(normalizedValue)) {
    replaceWithSpecial("React o Angular", ["React", "Angular"]);
  }
  if (/\b(?:apis?\s+rest(?:ful)?|rest(?:ful)?\s+apis?|servicios?\s+rest)\b/.test(normalizedValue)) {
    replaceWithSpecial("API REST", ["API", "REST"]);
  }
  if (/\b(?:ingles|english)\b[^.\n]{0,24}\bc1\b|\bc1\b[^.\n]{0,24}\b(?:ingles|english)\b/.test(normalizedValue)) {
    replaceWithSpecial("Inglés C1", ["Inglés"]);
  }
  if (/\b(?:desarrollo asistid[oa] por ia|herramientas? de desarrollo asistid[oa]s? por ia|github copilot|chatgpt|claude|ai[- ]assisted development)\b/.test(normalizedValue)) {
    replaceWithSpecial("Desarrollo asistido por IA", ["Inteligencia artificial"]);
  }
  const withoutCopilot = normalizedValue.replace(/\bgithub copilot\b/g, "");
  if (!hasTerm(withoutCopilot, "github")) requirements = requirements.filter((requirement) => requirement.label !== "GitHub");

  const labels = new Set(requirements.map((requirement) => requirement.label));
  requirements = requirements.filter((requirement) => {
    if (requirement.label === "Investigación" && (labels.has("Investigación de usuarios") || labels.has("Investigación jurídica"))) return false;
    if (requirement.label === "Marketing" && (labels.has("Marketing de contenidos") || labels.has("Email marketing"))) return false;
    if (requirement.label === "Vue.js" && (labels.has("Vue 2") || labels.has("Vue 3"))) return false;
    return true;
  });

  const knownAliases = new Set([
    ...REQUIREMENT_GROUPS.flatMap(([, aliases]) => aliases.map((alias) => normalize(alias))),
    ...[...SPECIAL_REQUIREMENTS.values()].flatMap((requirement) => requirement.aliases.map((alias) => normalize(alias))),
    "c1",
    "ia",
  ]);
  const acronyms = Array.from(new Set(value.match(/\b[A-Z][A-Z0-9]{1,9}\b/g) ?? []))
    .filter((token) => !STOP_WORDS.has(normalize(token)) && !knownAliases.has(normalize(token)))
    .map((token) => ({ label: token, aliases: [token] }));

  return [...requirements, ...acronyms].slice(0, 18);
}

const LANGUAGE_LEVEL = new Map([
  ["a1", 1], ["a2", 2], ["basico", 2], ["basic", 2],
  ["b1", 3], ["intermedio", 3], ["intermediate", 3], ["b2", 4],
  ["c1", 5], ["avanzado", 5], ["advanced", 5], ["c2", 6], ["nativo", 6], ["native", 6],
]);

function nearbyLanguageLevel(text, languagePattern) {
  const match = text.match(new RegExp(`(?:${languagePattern})[^.\\n|]{0,32}?\\b(a1|a2|b1|b2|c1|c2|basico|basic|intermedio|intermediate|avanzado|advanced|nativo|native)\\b|\\b(a1|a2|b1|b2|c1|c2|basico|basic|intermedio|intermediate|avanzado|advanced|nativo|native)\\b[^.\\n|]{0,20}?(?:${languagePattern})`));
  const level = match?.[1] ?? match?.[2];
  return level ? { label: level.toUpperCase(), rank: LANGUAGE_LEVEL.get(level) ?? 0 } : null;
}

function eligibilityChecks(jobDescription, resumeText, language) {
  const job = normalize(jobDescription);
  const resume = normalize(resumeText);
  const checks = [];
  const languageDefinitions = [
    { id: "english", pattern: "ingles|english", es: "Inglés", en: "English" },
    { id: "portuguese", pattern: "portugues|portuguese", es: "Portugués", en: "Portuguese" },
    { id: "french", pattern: "frances|french", es: "Francés", en: "French" },
  ];

  for (const definition of languageDefinitions) {
    const required = nearbyLanguageLevel(job, definition.pattern);
    if (!required) continue;
    const current = nearbyLanguageLevel(resume, definition.pattern);
    const label = `${language === "es" ? definition.es : definition.en} ${required.label}`;
    checks.push({
      id: `eligibility-${definition.id}`,
      label,
      status: current && current.rank >= required.rank ? "matched" : "missing",
      evidence: current
        ? localized(language, `El CV declara nivel ${current.label}.`, `The resume states a ${current.label} level.`)
        : localized(language, "El CV no declara ese nivel.", "The resume does not state that level."),
    });
  }

  const requiredYears = statedExperienceYears(job).sort((a, b) => b - a)[0];
  if (Number.isFinite(requiredYears)) {
    const declaredYears = statedExperienceYears(resume).sort((a, b) => b - a)[0];
    checks.push({
      id: "eligibility-experience",
      label: localized(language, `${requiredYears}+ años de experiencia`, `${requiredYears}+ years of experience`),
      status: Number.isFinite(declaredYears) ? (declaredYears >= requiredYears ? "matched" : "missing") : "review",
      evidence: Number.isFinite(declaredYears)
        ? localized(language, `El CV declara ${declaredYears} años de experiencia.`, `The resume states ${declaredYears} years of experience.`)
        : localized(language, "Revisa las fechas laborales; el CV no declara un total explícito.", "Review employment dates; the resume does not state an explicit total."),
    });
  }

  if (/\b(?:estudios?|formacion|degree|education)\b[^.\n]{0,90}\b(?:tecnic|universitari|bachiller|licenciatura|engineering|bachelor)\w*/.test(job)) {
    const found = /\b(?:bachiller|licenciad|titulad|egresad|universidad|universitari|instituto|tecnic|bachelor|degree|graduate)\w*/.test(resume);
    checks.push({
      id: "eligibility-education",
      label: localized(language, "Formación técnica o universitaria", "Technical or university education"),
      status: found ? "matched" : "review",
      evidence: found
        ? localized(language, "El CV contiene formación académica compatible para revisión.", "The resume contains compatible education for review.")
        : localized(language, "No se reconoció una formación equivalente con suficiente certeza.", "No equivalent education was recognized with enough confidence."),
    });
  }

  if (/\b(?:residencia|residir|resident|residence)\b[^.\n]{0,70}\bperu\b/.test(job)) {
    const found = /\bperu\b/.test(resume);
    checks.push({
      id: "eligibility-location",
      label: localized(language, "Residencia en Perú", "Residence in Peru"),
      status: found ? "matched" : "review",
      evidence: found
        ? localized(language, "El CV menciona Perú en los datos personales o laborales.", "The resume mentions Peru in personal or employment details.")
        : localized(language, "Confirma tu residencia; no debe inferirse únicamente por tus empleos.", "Confirm your residence; it should not be inferred only from employment history."),
    });
  }
  if (/\b(?:portafolio|portfolio)\b/.test(job)) {
    const found = /(?:https?:\/\/|www\.|\b(?:github\.com|behance\.net|dribbble\.com|portfolio\.)|\b[a-z0-9-]+\.(?:com|net|org|io|dev|pe|co)\b)/i.test(resumeText);
    checks.push({
      id: "eligibility-portfolio",
      label: localized(language, "Portafolio profesional", "Professional portfolio"),
      status: found ? "matched" : "review",
      evidence: found
        ? localized(language, "El CV incluye al menos un enlace profesional para revisión.", "The resume includes at least one professional link for review.")
        : localized(language, "Añade un enlace directo a trabajos que puedas demostrar.", "Add a direct link to work you can demonstrate."),
    });
  }
  return checks;
}

function issue(language, key, severity = "warning") {
  const [title, detail, suggestion] = copy[language].issues[key];
  return { id: key, severity, title, detail, suggestion };
}

function localized(language, spanish, english) {
  return language === "es" ? spanish : english;
}

function auditStatus(pass, warning = false) {
  return pass ? "pass" : warning ? "warning" : "fail";
}

function requirementFromLabel(label) {
  const special = SPECIAL_REQUIREMENTS.get(label);
  if (special) return special;
  const known = REQUIREMENT_GROUPS.find(([knownLabel]) => knownLabel === label);
  return known ? { label: known[0], aliases: known[1], projectable: !NON_PROJECT_REQUIREMENTS.has(label) } : { label, aliases: [label] };
}

function validateRuleText(value, requirements = []) {
  const plain = normalize(value);
  const actionVerbs = ACTION_VERBS.filter((verb) => new RegExp(`\\b${verb}\\b`).test(plain));
  const metricCount = countMeasurableEvidence(plain);
  const outcomeCount = countMatches(plain, OUTCOME_EXPRESSIONS);
  const hasQuantifiedEvidence = /\d|%|[$€£]/.test(value) || metricCount > 0;
  const matchedKeywords = requirements
    .filter((requirement) => (requirement.resumeAliases ?? requirement.aliases).some((alias) => hasTerm(plain, alias)))
    .map((requirement) => requirement.label);
  return {
    actionVerbs,
    metricCount,
    outcomeCount,
    hasActionVerb: actionVerbs.length > 0,
    hasMetric: metricCount > 0,
    hasOutcome: outcomeCount > 0,
    hasQuantifiedEvidence,
    hasQuantifiedAction: actionVerbs.length > 0 && hasQuantifiedEvidence,
    matchedKeywords,
  };
}

export function validateResumeBullet(value, options = {}) {
  const requirements = (options.keywords ?? []).map(requirementFromLabel);
  return validateRuleText(value, requirements);
}

function check(id, group, weight, status, title, evidence, recommendation) {
  return {
    id,
    group,
    weight,
    status,
    points: status === "pass" ? weight : status === "warning" ? weight / 2 : 0,
    title,
    evidence,
    recommendation,
  };
}

function buildImpactChecks({ actionCount, metricCount, outcomeCount, quantifiedActionCount }, language) {
  return [
    check("action-verbs", "impact", 6, auditStatus(actionCount >= 3, actionCount >= 1),
      localized(language, "Verbos de acción", "Action verbs"),
      localized(language, `${actionCount} verbos de acción distintos fueron reconocidos.`, `${actionCount} distinct action verbs were recognized.`),
      localized(language, "Inicia los logros con verbos concretos y variados.", "Start achievements with concrete, varied action verbs.")),
    check("measured-results", "impact", 6, auditStatus(metricCount >= 2, metricCount >= 1),
      localized(language, "Resultados medibles", "Measured results"),
      localized(language, `${metricCount} resultados cuantificables fueron detectados.`, `${metricCount} measurable results were detected.`),
      localized(language, "Añade cifras únicamente cuando puedas respaldarlas: porcentajes, volumen, tiempo o ahorro.", "Add figures only when supported: percentages, volume, time or savings.")),
    check("outcome-language", "impact", 4, auditStatus(outcomeCount >= 2, outcomeCount >= 1),
      localized(language, "Lenguaje de resultados", "Outcome language"),
      localized(language, `${outcomeCount} referencias a resultados o impacto fueron detectadas.`, `${outcomeCount} references to outcomes or impact were detected.`),
      localized(language, "Explica qué cambió gracias a tu trabajo sin inventar resultados.", "Explain what changed because of your work without inventing outcomes.")),
    check("quantified-actions", "impact", 4, auditStatus(quantifiedActionCount >= 2, quantifiedActionCount >= 1),
      localized(language, "Acciones con evidencia", "Evidence-backed actions"),
      localized(language, `${quantifiedActionCount} líneas combinan una acción con una cifra.`, `${quantifiedActionCount} lines combine an action with a figure.`),
      localized(language, "Conecta acciones y resultados comprobables en la misma viñeta.", "Connect actions and verifiable outcomes in the same bullet.")),
  ];
}

function scoreAuditGroups(auditGroups, auditChecks) {
  return auditGroups.map((group) => {
    const checks = auditChecks.filter((item) => item.group === group.id);
    const maximum = checks.reduce((total, item) => total + item.weight, 0);
    const earned = checks.reduce((total, item) => total + item.points, 0);
    return {
      ...group,
      score: Math.round((earned / maximum) * 100),
      maximum: 100,
      issueCount: checks.filter((item) => item.status !== "pass").length,
      checks,
    };
  });
}

function keywordVerdict(score, language) {
  return score === null
    ? localized(language, "Sin coincidencia calculable", "No measurable keyword match")
    : localized(language,
      score >= 80 ? "Alta coincidencia de palabras clave" : score >= 50 ? "Coincidencia parcial de palabras clave" : "Baja coincidencia de palabras clave",
      score >= 80 ? "High keyword match" : score >= 50 ? "Partial keyword match" : "Low keyword match");
}

export function analyzeResume(sourceText, jobDescription = "", language = "es", targetMode = "vacancy") {
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
  const jobKeywords = targetMode === "role" ? [] : keywordList(jobDescription);
  const eligibility = targetMode === "role" ? [] : eligibilityChecks(jobDescription, text, language);
  const lineRuleResults = lines.map((line) => validateRuleText(line, jobKeywords));
  const actionVerbCounts = Object.fromEntries(ACTION_VERBS.map((verb) => [verb, lineRuleResults.filter((rules) => rules.actionVerbs.includes(verb)).length]));
  const actionCount = Object.values(actionVerbCounts).filter((count) => count > 0).length;
  const metricCount = lineRuleResults.reduce((total, rules) => total + rules.metricCount, 0);
  const bulletCount = lines.filter((line) => /^[-•*▪‣]/.test(line)).length;
  const firstPersonCount = countMatches(plain, [/\b(?:yo|mio|mia|mi|i|my|mine)\b/g]);
  const unusualCount = text.replace(/[\p{L}\p{N}\s.,;:!?@%+&/()#'’"–—-]/gu, "").length;
  const cleanRatio = text.length ? 1 - unusualCount / text.length : 0;
  const comparableLines = lines.map((line) => normalize(line).replace(/\s+/g, " ").trim()).filter((line) => line.length >= 24);
  const lineFrequency = comparableLines.reduce((frequencies, line) => frequencies.set(line, (frequencies.get(line) ?? 0) + 1), new Map());
  const duplicateCount = Array.from(lineFrequency.values()).reduce((total, frequency) => total + Math.max(0, frequency - 1), 0);
  const denseLineCount = lines.filter((line) => line.length > 220 || line.split(/\s+/).length > 38).length;
  const outcomeCount = lineRuleResults.reduce((total, rules) => total + rules.outcomeCount, 0);
  const quantifiedActionCount = lineRuleResults.filter((rules) => rules.hasQuantifiedAction).length;

  const auditChecks = [
    check("extractable-text", "parsing", 5, auditStatus(wordCount >= 120, wordCount >= 60),
      localized(language, "Texto extraíble", "Extractable text"),
      localized(language, `${wordCount} palabras pudieron leerse como texto.`, `${wordCount} words were read as text.`),
      localized(language, "Exporta el CV con texto seleccionable y evita documentos escaneados.", "Export the resume with selectable text and avoid scanned documents.")),
    check("clean-text", "parsing", 5, auditStatus(cleanRatio >= 0.985, cleanRatio >= 0.97),
      localized(language, "Calidad de extracción", "Extraction quality"),
      localized(language, `${Math.round(cleanRatio * 100)}% del contenido usa caracteres legibles.`, `${Math.round(cleanRatio * 100)}% of the content uses readable characters.`),
      localized(language, "Revisa símbolos extraños y vuelve a exportar el archivo si el texto aparece cortado.", "Review unusual symbols and re-export the file if text appears broken.")),
    check("line-structure", "parsing", 5, auditStatus(lines.length >= 12, lines.length >= 7),
      localized(language, "Estructura por líneas", "Line structure"),
      localized(language, `${lines.length} líneas de contenido fueron identificadas.`, `${lines.length} content lines were identified.`),
      localized(language, "Separa encabezados, cargos y logros en líneas independientes.", "Keep headings, roles and achievements on separate lines.")),
    check("recognizable-structure", "parsing", 5, auditStatus(sectionCount >= 3, sectionCount >= 2),
      localized(language, "Clasificación del contenido", "Content classification"),
      localized(language, `${sectionCount} de 4 secciones principales fueron reconocidas.`, `${sectionCount} of 4 core sections were recognized.`),
      localized(language, "Utiliza encabezados convencionales para que el ATS clasifique cada bloque.", "Use conventional headings so the ATS can classify each block.")),

    check("profile-section", "sections", 4, auditStatus(sections.profile),
      localized(language, "Perfil profesional", "Professional summary"),
      localized(language, sections.profile ? "Se reconoció una sección de perfil o resumen." : "No se reconoció una sección de perfil.", sections.profile ? "A summary or profile section was recognized." : "No summary section was recognized."),
      localized(language, "Añade un perfil profesional breve con especialidad y propuesta de valor.", "Add a concise professional summary with specialty and value proposition.")),
    check("experience-section", "sections", 5, auditStatus(sections.experience),
      localized(language, "Experiencia profesional", "Professional experience"),
      localized(language, sections.experience ? "La experiencia tiene un encabezado reconocible." : "La experiencia no tiene un encabezado reconocible.", sections.experience ? "Experience has a recognizable heading." : "Experience does not have a recognizable heading."),
      localized(language, "Usa “Experiencia profesional” o “Professional experience”.", "Use “Professional experience” or “Work experience”.")),
    check("education-section", "sections", 4, auditStatus(sections.education),
      localized(language, "Educación", "Education"),
      localized(language, sections.education ? "La formación académica puede clasificarse." : "No se reconoció la formación académica.", sections.education ? "Education can be classified." : "Education was not recognized."),
      localized(language, "Usa un encabezado estándar como “Educación” o “Formación académica”.", "Use a standard heading such as “Education”.")),
    check("skills-section", "sections", 4, auditStatus(sections.skills),
      localized(language, "Habilidades", "Skills"),
      localized(language, sections.skills ? "Se reconoció una sección separada de habilidades." : "No se reconoció una sección separada de habilidades.", sections.skills ? "A dedicated skills section was recognized." : "No dedicated skills section was recognized."),
      localized(language, "Agrupa herramientas y competencias en una sección de habilidades.", "Group tools and competencies in a dedicated skills section.")),
    check("date-coverage", "sections", 3, auditStatus(dateCount >= 4, dateCount >= 2),
      localized(language, "Cobertura de fechas", "Date coverage"),
      localized(language, `${dateCount} referencias de fecha fueron detectadas.`, `${dateCount} date references were detected.`),
      localized(language, "Incluye fechas simples y consistentes en experiencia y educación.", "Use simple, consistent dates in experience and education.")),

    check("resume-length", "content", 5, auditStatus(wordCount >= 250 && wordCount <= 900, wordCount >= 150 && wordCount <= 1200),
      localized(language, "Extensión del CV", "Resume length"),
      localized(language, `El documento contiene ${wordCount} palabras.`, `The document contains ${wordCount} words.`),
      localized(language, "Prioriza información relevante; como guía, 250–900 palabras suelen ser manejables.", "Prioritize relevant information; as a guide, 250–900 words is usually manageable.")),
    check("bullet-readability", "content", 5, auditStatus(bulletCount >= 3, bulletCount >= 1),
      localized(language, "Lectura mediante viñetas", "Bullet readability"),
      localized(language, `${bulletCount} líneas con viñetas fueron detectadas.`, `${bulletCount} bulleted lines were detected.`),
      localized(language, "Usa una viñeta o línea separada por responsabilidad o logro.", "Use one bullet or separate line per responsibility or achievement.")),
    check("first-person", "content", 5, auditStatus(firstPersonCount <= 2, firstPersonCount <= 4),
      localized(language, "Redacción directa", "Direct writing"),
      localized(language, `${firstPersonCount} usos de primera persona fueron detectados.`, `${firstPersonCount} first-person references were detected.`),
      localized(language, "Empieza directamente con el verbo de acción y elimina “yo” o “mi”.", "Start directly with the action verb and remove “I” or “my”.")),
    check("duplicate-lines", "content", 5, auditStatus(duplicateCount === 0, duplicateCount <= 2),
      localized(language, "Contenido repetido", "Repeated content"),
      localized(language, `${duplicateCount} líneas repetidas fueron detectadas.`, `${duplicateCount} repeated lines were detected.`),
      localized(language, "Elimina tareas duplicadas y conserva el ejemplo con mayor impacto.", "Remove duplicate duties and keep the strongest example.")),
    check("dense-lines", "content", 5, auditStatus(denseLineCount === 0, denseLineCount <= 2),
      localized(language, "Densidad de lectura", "Reading density"),
      localized(language, `${denseLineCount} líneas excesivamente densas fueron detectadas.`, `${denseLineCount} overly dense lines were detected.`),
      localized(language, "Divide párrafos extensos en logros o responsabilidades concretas.", "Split long paragraphs into concrete achievements or responsibilities.")),

    ...buildImpactChecks({ actionCount, metricCount, outcomeCount, quantifiedActionCount }, language),

    check("email-contact", "contact", 6, auditStatus(hasEmail),
      localized(language, "Correo electrónico", "Email address"),
      localized(language, hasEmail ? "Se detectó un correo en texto normal." : "No se detectó un correo reconocible.", hasEmail ? "An email address was detected as plain text." : "No recognizable email address was detected."),
      localized(language, "Incluye un correo profesional en texto normal.", "Include a professional email address as plain text.")),
    check("phone-contact", "contact", 5, auditStatus(hasPhone),
      localized(language, "Teléfono", "Phone number"),
      localized(language, hasPhone ? "Se detectó un número telefónico reconocible." : "No se detectó un teléfono reconocible.", hasPhone ? "A recognizable phone number was detected." : "No recognizable phone number was detected."),
      localized(language, "Incluye código de país y mantén el número en una sola línea.", "Include the country code and keep the number on one line.")),
    check("professional-link", "contact", 4, auditStatus(hasLink),
      localized(language, "Enlace profesional", "Professional link"),
      localized(language, hasLink ? "Se detectó LinkedIn, portafolio o un sitio profesional." : "No se detectó LinkedIn, portafolio o sitio profesional.", hasLink ? "LinkedIn, a portfolio or a professional site was detected." : "No LinkedIn, portfolio or professional site was detected."),
      localized(language, "Añade LinkedIn o portafolio cuando sea relevante para el puesto.", "Add LinkedIn or a portfolio when relevant to the role.")),
  ];

  const auditGroupDefinitions = [
    ["parsing", localized(language, "Lectura ATS", "ATS parsing")],
    ["sections", localized(language, "Secciones", "Sections")],
    ["content", localized(language, "Contenido y claridad", "Content and clarity")],
    ["impact", localized(language, "Impacto", "Impact")],
    ["contact", localized(language, "Contacto", "Contact")],
  ];
  const auditGroups = scoreAuditGroups(auditGroupDefinitions.map(([id, label]) => ({ id, label })), auditChecks);
  const atsQualityScore = Math.max(0, Math.min(100, Math.round(auditChecks.reduce((total, item) => total + item.points, 0))));

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

  // A title names an objective, not the requirements of a specific employer.
  const keywordCounts = Object.fromEntries(jobKeywords.map((requirement) => [requirement.label, lineRuleResults.filter((rules) => rules.matchedKeywords.includes(requirement.label)).length]));
  const matchedRequirements = jobKeywords.filter((requirement) => keywordCounts[requirement.label] > 0);
  const matched = matchedRequirements.map((requirement) => requirement.label);
  const missingRequirements = jobKeywords.filter((requirement) => !matchedRequirements.includes(requirement));
  const missing = missingRequirements.map((requirement) => requirement.label);
  const projectMissing = missingRequirements.filter((requirement) => requirement.projectable !== false).map((requirement) => requirement.label);
  const nonProjectMissing = missingRequirements.filter((requirement) => requirement.projectable === false).map((requirement) => requirement.label);
  const matchScore = jobKeywords.length ? Math.round((matched.length / jobKeywords.length) * 100) : null;
  if (matchScore !== null && matchScore >= 70) strengths.push(copy[language].strengths.match);

  // Job matching stays separate from the document-quality checks. A missing
  // vacancy or unrecognized requirements must never produce a generic match.
  const score = matchScore;
  const verdict = keywordVerdict(score, language);

  return {
    targetMode,
    targetRole: targetMode === "role" ? jobDescription.trim() : "",
    resumeSkills: resumeSearchSkills(text),
    score,
    atsQualityScore,
    verdict,
    categories: auditGroups.map(({ label, score: categoryScore, maximum }) => ({ label, score: categoryScore, maximum })),
    auditGroups,
    issues,
    strengths,
    eligibilityChecks: eligibility,
    metrics: {
      wordCount,
      sectionCount,
      metricCount,
      actionCount,
      checkCount: auditChecks.length,
      passedCount: auditChecks.filter((item) => item.status === "pass").length,
    },
    keywordMatch: jobKeywords.length ? { score: matchScore, matched, missing, projectMissing, nonProjectMissing } : null,
    ruleSnapshot: {
      actionVerbCounts,
      metricCount,
      outcomeCount,
      quantifiedActionCount,
      jobKeywords: jobKeywords.map((requirement) => requirement.label),
      keywordCounts,
    },
  };
}

export function applyResumeBulletEdits(result, edits, language = "es") {
  if (!result.ruleSnapshot || !edits.length) return result;

  const snapshot = result.ruleSnapshot;
  const requirements = snapshot.jobKeywords.map(requirementFromLabel);
  const actionVerbCounts = { ...snapshot.actionVerbCounts };
  const keywordCounts = { ...snapshot.keywordCounts };
  let metricCount = snapshot.metricCount;
  let outcomeCount = snapshot.outcomeCount;
  let quantifiedActionCount = snapshot.quantifiedActionCount;

  for (const edit of edits) {
    const original = validateRuleText(edit.originalText, requirements);
    const current = validateRuleText(edit.currentText, requirements);
    metricCount += current.metricCount - original.metricCount;
    outcomeCount += current.outcomeCount - original.outcomeCount;
    quantifiedActionCount += Number(current.hasQuantifiedAction) - Number(original.hasQuantifiedAction);

    for (const verb of ACTION_VERBS) {
      actionVerbCounts[verb] += Number(current.actionVerbs.includes(verb)) - Number(original.actionVerbs.includes(verb));
    }
    for (const keyword of snapshot.jobKeywords) {
      keywordCounts[keyword] += Number(current.matchedKeywords.includes(keyword)) - Number(original.matchedKeywords.includes(keyword));
    }
  }

  metricCount = Math.max(0, metricCount);
  outcomeCount = Math.max(0, outcomeCount);
  quantifiedActionCount = Math.max(0, quantifiedActionCount);
  const actionCount = Object.values(actionVerbCounts).filter((count) => count > 0).length;
  const liveImpactChecks = buildImpactChecks({ actionCount, metricCount, outcomeCount, quantifiedActionCount }, language);
  const impactById = new Map(liveImpactChecks.map((item) => [item.id, item]));
  const auditChecks = result.auditGroups.flatMap((group) => group.checks).map((item) => impactById.get(item.id) ?? item);
  const auditGroups = scoreAuditGroups(result.auditGroups.map(({ id, label }) => ({ id, label })), auditChecks);
  const atsQualityScore = Math.max(0, Math.min(100, Math.round(auditChecks.reduce((total, item) => total + item.points, 0))));

  const matched = snapshot.jobKeywords.filter((keyword) => keywordCounts[keyword] > 0);
  const missing = snapshot.jobKeywords.filter((keyword) => keywordCounts[keyword] <= 0);
  const score = snapshot.jobKeywords.length ? Math.round((matched.length / snapshot.jobKeywords.length) * 100) : null;

  return {
    ...result,
    score,
    atsQualityScore,
    verdict: keywordVerdict(score, language),
    categories: auditGroups.map(({ label, score: categoryScore, maximum }) => ({ label, score: categoryScore, maximum })),
    auditGroups,
    metrics: {
      ...result.metrics,
      metricCount,
      actionCount,
      passedCount: auditChecks.filter((item) => item.status === "pass").length,
    },
    keywordMatch: snapshot.jobKeywords.length ? { score, matched, missing } : null,
  };
}
