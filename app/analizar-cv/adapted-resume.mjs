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

const DOMAIN_SIGNALS = [
  { domain: "legal", profession: /\b(?:abogad\w*|asesor\w+ legal|jurista)\b/gi, related: /\b(?:derecho|legal|litig\w*|contrat\w*|jurid\w*|compliance|cumplimiento|fiscal|penal|civil)\b/gi },
  { domain: "architecture", profession: /\b(?:arquitect\w*|urbanista)\b/gi, related: /\b(?:autocad|revit|bim|obra|construccion|planos?|urbanismo|sketchup)\b/gi },
  { domain: "health", profession: /\b(?:medic\w*|enfermer\w*|psicolog\w*|terapeut\w*|farmaceut\w*)\b/gi, related: /\b(?:clinica|paciente|salud|hospital|terapia|farmac\w*)\b/gi },
  { domain: "marketing", profession: /\b(?:especialista en marketing|mercadolog\w*|publicista|community manager)\b/gi, related: /\b(?:marketing|seo|sem|campan\w*|contenido|social media|publicidad|ads|marca)\b/gi },
  { domain: "finance", profession: /\b(?:contador\w*|auditor\w*|analista financier\w*|economista)\b/gi, related: /\b(?:contab\w*|finanz\w*|impuesto|presupuesto|tesorer\w*|niif|ifrs)\b/gi },
  { domain: "operations", profession: /\b(?:especialista en operaciones|jefe de operaciones|ingenier\w+ industrial|logistic\w*)\b/gi, related: /\b(?:logistica|operaciones|inventario|compras|supply chain|calidad|produccion)\b/gi },
  { domain: "software", profession: /\b(?:desarrollador\w*|programador\w*|ingenier\w+ de software|software engineer|frontend developer|backend developer|full ?stack)\b/gi, related: /\b(?:software|frontend|backend|javascript|typescript|react|angular|python|api|sql|devops)\b/gi },
  { domain: "design", profession: /\b(?:disenador\w*|designer|director\w+ de arte|ux designer|ui designer)\b/gi, related: /\b(?:diseno|figma|photoshop|illustrator|indesign|after effects|blender|3d max|ux|ui|branding|identidad visual|ilustracion)\b/gi },
];

function signalCount(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

export function inferProfessionalDomain(sourceText, targetLabel = "") {
  const source = normalize(sourceText);
  const target = normalize(targetLabel);
  const ranked = DOMAIN_SIGNALS.map((signal, index) => ({
    domain: signal.domain,
    index,
    professionScore: Math.min(1, signalCount(source, signal.profession)) * 20 + Math.min(1, signalCount(target, signal.profession)) * 40,
    relatedScore: signalCount(source, signal.related) * 2 + signalCount(target, signal.related) * 3,
  })).sort((a, b) => b.professionScore - a.professionScore || b.relatedScore - a.relatedScore || a.index - b.index);
  const best = ranked[0];
  return best && (best.professionScore || best.relatedScore) ? best.domain : "general";
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
  const assistedDevelopment = pick(/^(?:desarrollo asistido por ia|ai assisted development)$/);
  const apiRest = pick(/^(?:api rest|rest api)$/);
  const dashboard = pick(/(?:dashboard|kpi|business intelligence|datos gobernados|governed data)/);
  const scalableFrontend = pick(/arquitectura frontend escalable|scalable frontend architecture/);
  const testingPractice = pick(/^testing$/);
  const codeReview = pick(/^code review$/);
  const cloud = pick(/^(?:azure|aws|amazon web services|google cloud|gcp)$/);
  const solid = pick(/^(?:solid|clean architecture|arquitectura limpia)$/);
  const container = pick(/^(?:docker|kubernetes|k8s)$/);
  const delivery = pick(/^(?:ci\/cd|continuous integration|continuous delivery)$/);
  const categorized = new Set([frontend, backend, testing, versionControl, database, artificialIntelligence, assistedDevelopment, apiRest, dashboard, scalableFrontend, testingPractice, codeReview, cloud, solid, container, delivery].filter(Boolean));
  const other = keywords.filter((keyword) => !categorized.has(keyword));

  if (language === "es") {
    if (dashboard) {
      const stack = [frontend, pick(/^typescript$/)].filter(Boolean);
      const quality = [
        scalableFrontend ? "Construir componentes reutilizables dentro de una arquitectura frontend escalable" : "",
        testingPractice ? "añadir pruebas unitarias y de flujo" : "",
        codeReview ? "aplicar revisión de código mediante pull requests" : "",
        assistedDevelopment ? "documentar y validar el uso de herramientas de IA durante el desarrollo" : "",
      ].filter(Boolean);
      const qualityLine = (quality.length ? quality.join("; ") : "Documentar la arquitectura, las decisiones técnicas y las instrucciones de ejecución").replace(/^./, (letter) => letter.toUpperCase()) + ".";
      return ["Dashboard empresarial de operaciones y KPIs", [
        "Desarrollar un dashboard empresarial" + (stack.length ? " con " + joinedKeywords(stack, "es") : "") + " para consultar indicadores operativos por periodo, estado y responsable.",
        "Integrar " + (apiRest || "una API REST") + " segura con autenticación, permisos, manejo de errores y una capa tipada de acceso a datos.",
        "Implementar KPIs, filtros combinables, drill-down y detalle de registros sobre un conjunto de datos gobernado.",
        qualityLine,
      ]];
    }
    if (cloud || solid || container || delivery) {
      const sentences = ["Desarrollar un sistema de gestión de incidencias con usuarios, roles, prioridades y seguimiento de SLA, incorporando " + joinedKeywords(keywords, "es") + "."];
      sentences.push(solid
        ? "Estructurar la solución aplicando " + solid + " y separando dominio, aplicación, infraestructura e interfaces."
        : "Separar las reglas de negocio, la persistencia y las integraciones mediante una arquitectura modular.");
      sentences.push(cloud
        ? "Desplegar la aplicación, la base de datos y el almacenamiento de archivos en " + cloud + "."
        : container
          ? "Empaquetar los servicios y la base de datos con " + container + " para ejecutar una demo reproducible."
          : "Publicar una API documentada y preparar una instancia reproducible para demostración.");
      sentences.push("Implementar pruebas automatizadas, monitoreo y un flujo de integración y despliegue continuo.");
      return ["Sistema de gestión de incidencias con SLA", sentences];
    }
    const implementation = [];
    if (frontend) implementation.push("una interfaz en " + frontend);
    if (backend) implementation.push("servicios en " + backend);
    if (database) implementation.push("persistencia en " + database);
    const sentences = ["Construir una aplicación funcional" + (implementation.length ? " con " + joinedKeywords(implementation, "es") : "") + "."];
    if (artificialIntelligence) sentences.push("Incorporar un componente de " + artificialIntelligence + " aplicado a una función concreta del producto.");
    if (assistedDevelopment) sentences.push("Utilizar herramientas de desarrollo asistido por IA para apoyar la planificación, las pruebas y la documentación, revisando cada resultado antes de incorporarlo.");
    if (testing) sentences.push("Automatizar las pruebas del flujo principal con " + testing + ".");
    if (versionControl) sentences.push("Gestionar el código fuente y el historial de cambios con " + versionControl + ".");
    if (other.length) sentences.push("Integrar " + joinedKeywords(other, "es") + " dentro del flujo principal.");
    sentences.push("Documentar la arquitectura, la configuración, las pruebas y las instrucciones de ejecución.");
    const title = frontend && backend
      ? "Aplicación web con " + joinedKeywords([frontend, backend], "es")
      : database && artificialIntelligence
        ? "Aplicación con " + joinedKeywords([database, artificialIntelligence], "es")
        : "Proyecto técnico con " + joinedKeywords(keywords, "es");
    return [title, sentences];
  }

  if (dashboard) {
    const stack = [frontend, pick(/^typescript$/)].filter(Boolean);
      const quality = [
      scalableFrontend ? "Build reusable components within scalable frontend architecture" : "",
      testingPractice ? "add unit and flow tests" : "",
      codeReview ? "apply code review through pull requests" : "",
        assistedDevelopment ? "document and validate the use of AI-assisted development tools" : "",
      ].filter(Boolean);
    const qualityLine = (quality.length ? quality.join("; ") : "Document the architecture, technical decisions and setup instructions").replace(/^./, (letter) => letter.toUpperCase()) + ".";
    return ["Enterprise operations and KPI dashboard", [
      "Build an enterprise dashboard" + (stack.length ? " with " + joinedKeywords(stack, "en") : "") + " to review operational indicators by period, status and owner.",
      "Integrate " + (apiRest || "a REST API") + " securely with authentication, permissions, error handling and a typed data-access layer.",
      "Implement KPIs, combinable filters, drill-down and record details over a governed dataset.",
      qualityLine,
    ]];
  }

  if (cloud || solid || container || delivery) {
    const sentences = ["Build an incident-management system with users, roles, priorities and SLA tracking, incorporating " + joinedKeywords(keywords, "en") + "."];
    sentences.push(solid
      ? "Structure the solution with " + solid + ", separating domain, application, infrastructure and interfaces."
      : "Separate business rules, persistence and integrations through a modular architecture.");
    sentences.push(cloud
      ? "Deploy the application, database and file storage on " + cloud + "."
      : container
        ? "Package the services and database with " + container + " for a reproducible demonstration environment."
        : "Publish a documented API and prepare a reproducible demonstration environment.");
    sentences.push("Add automated tests, monitoring and a continuous integration and deployment workflow.");
    return ["SLA incident-management system", sentences];
  }

  const implementation = [];
  if (frontend) implementation.push("a " + frontend + " interface");
  if (backend) implementation.push(backend + " services");
  if (database) implementation.push(database + " persistence");
  const sentences = ["Build a functional application" + (implementation.length ? " with " + joinedKeywords(implementation, "en") : "") + "."];
  if (artificialIntelligence) sentences.push("Add a " + artificialIntelligence + " component for one concrete product function.");
  if (assistedDevelopment) sentences.push("Use AI-assisted development tools for planning, tests and documentation, reviewing every result before adoption.");
  if (testing) sentences.push("Automate the core flow tests with " + testing + ".");
  if (versionControl) sentences.push("Manage source code and change history with " + versionControl + ".");
  if (other.length) sentences.push("Integrate " + joinedKeywords(other, "en") + " into the core flow.");
  sentences.push("Document the architecture, configuration, tests and setup instructions.");
  const title = frontend && backend
    ? "Web application using " + joinedKeywords([frontend, backend], "en")
    : database && artificialIntelligence
      ? "Application using " + joinedKeywords([database, artificialIntelligence], "en")
      : "Technical project using " + joinedKeywords(keywords, "en");
  return [title, sentences];
}

function projectKeywordKey(keyword) {
  const value = normalize(keyword).replace(/[^a-z0-9]+/g, " ").trim();
  if (/\bux\b/.test(value) && /\bui\b/.test(value)) return "ux-ui";
  if (/investigacion de usuarios|user research/.test(value)) return "user-research";
  if (/^investigacion$|^research$/.test(value)) return "research";
  return value;
}

function projectKeywordEntries(keywords) {
  const entries = new Map();
  for (const keyword of keywords) {
    const key = projectKeywordKey(keyword);
    if (!key) continue;
    const current = entries.get(key);
    if (current) current.coveredKeywords.push(keyword);
    else entries.set(key, { key, label: keyword, coveredKeywords: [keyword] });
  }
  if (entries.has("user-research") && entries.has("research")) {
    entries.get("user-research").coveredKeywords.push(...entries.get("research").coveredKeywords);
    entries.delete("research");
  }
  if (entries.has("ux-ui")) {
    for (const key of ["ux", "ui"]) {
      if (!entries.has(key)) continue;
      entries.get("ux-ui").coveredKeywords.push(...entries.get(key).coveredKeywords);
      entries.delete(key);
    }
  } else if (entries.has("ux") && entries.has("ui")) {
    const ux = entries.get("ux");
    const ui = entries.get("ui");
    entries.delete("ux");
    entries.delete("ui");
    entries.set("ux-ui", { key: "ux-ui", label: "UX/UI", coveredKeywords: [...ux.coveredKeywords, ...ui.coveredKeywords] });
  }
  return [...entries.values()];
}

function projectKeywordGroups(keywords, domain) {
  const entries = projectKeywordEntries(keywords);
  if (!entries.length) return [];
  if (domain === "design") {
    const uxPattern = /^(?:ux-ui|ux|ui|user-research|research)$|\b(?:figma|prototip\w*|usabilidad|accesibilidad|arquitectura de informacion|comunicacion|usuarios?)\b/i;
    const ux = entries.filter((entry) => uxPattern.test(entry.key));
    const visual = entries.filter((entry) => !uxPattern.test(entry.key));
    return [ux, visual].filter((group) => group.length);
  }
  if (domain === "software" && entries.length <= 10) return [entries];
  if (entries.length <= 7) return [entries];
  const groupSize = Math.ceil(entries.length / Math.min(2, entries.length));
  const groups = [];
  for (let index = 0; index < entries.length; index += groupSize) groups.push(entries.slice(index, index + groupSize));
  return groups;
}

function designProjectCopy(keywords, language) {
  const terms = joinedKeywords(keywords, language);
  const normalized = normalize(terms);
  const uxProject = /\b(?:ux|ui|figma|prototip|usabilidad|accesibilidad|investigacion|comunicacion|usuarios?)\b/.test(normalized);
  const motionProject = /\b(?:after effects|motion|video|animacion|blender|3d|max)\b/.test(normalized);

  if (language !== "es") {
    if (uxProject) return ["UX/UI redesign for a service platform", [
      "Define the user problem and project scope, incorporating " + terms + ".",
      "Research user needs through short interviews, a competitor review and a journey map.",
      "Design the core responsive flow, an interactive prototype and a small component system.",
      "Validate the prototype with a usability test and document findings and design decisions.",
    ]];
    return [motionProject ? "Visual campaign for a product launch" : "Visual identity for a local brand", [
      "Define the audience, concept and visual direction, incorporating " + terms + ".",
      "Create the main visual system and the digital and print assets required for the launch.",
      "Prepare editable source files, final exports and a presentation explaining the design decisions.",
    ]];
  }

  if (uxProject) return ["Rediseño UX/UI de una plataforma de servicios", [
    "Definir el problema de usuario y el alcance del rediseño, incorporando " + terms + ".",
    "Investigar las necesidades de usuarios mediante entrevistas breves, revisión de referentes y un mapa de recorrido.",
    "Diseñar el flujo principal responsive, un prototipo navegable y un sistema básico de componentes.",
    "Validar el prototipo con una prueba de usabilidad y documentar hallazgos y decisiones de diseño.",
  ]];
  return [motionProject ? "Campaña visual para el lanzamiento de un producto" : "Sistema de identidad para una marca local", [
    "Definir el público, el concepto y la dirección visual, incorporando " + terms + ".",
    "Diseñar el sistema gráfico principal y las piezas digitales e impresas necesarias para el lanzamiento.",
    "Preparar archivos editables, artes finales y una presentación que explique las decisiones de diseño.",
  ]];
}

function professionalProjectCopy(domain, keywords, language) {
  if (domain === "software") return softwareProjectCopy(keywords, language);
  if (domain === "design") return designProjectCopy(keywords, language);
  const terms = joinedKeywords(keywords, language);
  if (language !== "es") {
    const english = {
      legal: ["Legal file for a simulated small-business case", ["Define a realistic small-business scenario involving " + terms + ".", "Analyze the applicable rules, evidence and risks in a structured legal matrix.", "Draft a legal memorandum and the supporting document checklist with a reasoned conclusion."]],
      architecture: ["Accessible compact-home concept", ["Define the site, users and design requirements, incorporating " + terms + ".", "Develop the floor plans, spatial model and key technical decisions.", "Prepare a concise design report, final drawings and a board suitable for portfolio review."]],
      health: ["Educational protocol for a simulated case", ["Define a supervised simulated case involving " + terms + " without using patient data.", "Develop the protocol, decision criteria and educational materials.", "Document safety considerations, follow-up steps and learning outcomes for review."]],
      marketing: ["Digital launch for a local service", ["Define the audience, offer and campaign objective, incorporating " + terms + ".", "Design the message, channel plan and required content pieces.", "Prepare the publishing calendar, budget assumptions and measurement dashboard."]],
      finance: ["Budget and cash-flow model for a small business", ["Define a realistic business scenario involving " + terms + ".", "Build the assumptions, controls, budget and cash-flow model.", "Present key scenarios, findings and recommendations in an executive summary."]],
      operations: ["Small-business inventory process redesign", ["Map the current process and identify a concrete problem involving " + terms + ".", "Design the future workflow, roles, controls and tracking indicators.", "Document the implementation plan and an evaluation checklist."]],
      general: ["Practical solution for a local service", ["Define a concrete user problem and scope involving " + terms + ".", "Develop the proposed solution and the main deliverables.", "Prepare a short presentation with the method, validation criteria and next steps."]],
    };
    return english[domain] ?? english.general;
  }
  const spanish = {
    legal: ["Expediente jurídico para un caso simulado de pyme", ["Delimitar un escenario empresarial verosímil que requiera " + terms + ".", "Analizar la normativa, la evidencia y los riesgos en una matriz jurídica estructurada.", "Redactar un informe legal y una lista de documentos de sustento con una conclusión razonada."]],
    architecture: ["Anteproyecto de vivienda compacta accesible", ["Definir el terreno, los usuarios y los requisitos del encargo, incorporando " + terms + ".", "Desarrollar plantas, modelo espacial y decisiones técnicas principales.", "Preparar memoria descriptiva, planos finales y una lámina apta para portafolio."]],
    health: ["Protocolo educativo para un caso simulado", ["Delimitar un caso simulado y supervisado que incorpore " + terms + " sin utilizar datos de pacientes.", "Elaborar el protocolo, los criterios de decisión y los materiales educativos.", "Documentar medidas de seguridad, seguimiento y aprendizajes para revisión profesional."]],
    marketing: ["Lanzamiento digital de un servicio local", ["Definir la audiencia, la propuesta y el objetivo de campaña, incorporando " + terms + ".", "Diseñar el mensaje, el plan de canales y las piezas de contenido necesarias.", "Preparar el calendario, los supuestos de presupuesto y un tablero de medición."]],
    finance: ["Modelo de presupuesto y flujo de caja para una pyme", ["Definir un escenario empresarial verosímil que incorpore " + terms + ".", "Construir supuestos, controles, presupuesto y flujo de caja.", "Presentar escenarios, hallazgos y recomendaciones en un resumen ejecutivo."]],
    operations: ["Rediseño del proceso de inventario de una pyme", ["Mapear el proceso actual e identificar un problema concreto que requiera " + terms + ".", "Diseñar el flujo futuro, los responsables, los controles y los indicadores de seguimiento.", "Documentar el plan de implementación y una lista de verificación para evaluarlo."]],
    general: ["Solución práctica para un servicio local", ["Definir un problema concreto y el alcance del proyecto, incorporando " + terms + ".", "Desarrollar la solución propuesta y sus entregables principales.", "Preparar una presentación breve con el método, los criterios de validación y los siguientes pasos."]],
  };
  return spanish[domain] ?? spanish.general;
}

function completeProjectPlan(domain, keywords, language) {
  const terms = joinedKeywords(keywords, language);
  const normalized = normalize(terms);
  const cloudSoftware = domain === "software" && /\b(?:azure|aws|amazon web services|google cloud|gcp|solid|clean architecture|arquitectura limpia|docker|kubernetes|k8s|ci\/cd|continuous integration|continuous delivery)\b/.test(normalized);
  const dashboardSoftware = domain === "software" && /\b(?:dashboard|kpi|business intelligence|datos gobernados|governed data)\b/.test(normalized);
  const dashboardArchitecture = /arquitectura frontend escalable|scalable frontend architecture/.test(normalized);
  const dashboardTesting = /\btesting\b/.test(normalized);
  const dashboardReview = /\bcode review\b/.test(normalized);
  const dashboardAssisted = /desarrollo asistido por ia|ai assisted development/.test(normalized);

  if (language !== "es") {
    if (dashboardSoftware) return {
      summary: "Build a working operations dashboard for a simulated service company. Analysts and managers will be able to inspect governed business data, understand each KPI and move from a summary metric to the records that explain it.",
      scope: ["Authenticate analyst and manager roles with different permissions.", "Consume a secure REST API through a typed service layer with loading, empty and error states.", "Display operational KPIs with date, status and owner filters plus drill-down to record details.", dashboardArchitecture ? "Create reusable chart, metric, filter and table components in a scalable frontend structure." : "Create reusable chart, metric, filter and table components.", dashboardTesting || dashboardReview || dashboardAssisted ? [dashboardTesting ? "Add unit and flow tests" : "", dashboardReview ? "use pull-request review" : "", dashboardAssisted ? "document how AI-assisted tools were verified" : ""].filter(Boolean).join(", ") + "." : "Document the technical decisions and validation criteria."],
      deliverables: [dashboardTesting || dashboardReview ? "Public repository with branches, pull requests and passing tests." : "Public repository with meaningful commits.", "Online demo with analyst and manager test accounts.", dashboardAssisted ? "README with architecture, KPI definitions, setup and validation of AI-assisted work." : "README with architecture, KPI definitions and setup.", "Mock or documented API, data dictionary and portfolio screenshots."],
    };
    if (cloudSoftware) return {
      summary: "Build a working professional MVP that a recruiter can open and test. The system will manage incidents from creation through resolution and will demonstrate " + terms + " through its architecture and deployment.",
      scope: ["Authenticate users with customer, agent and administrator roles.", "Create, assign and track incidents with priorities, states, comments and attachments.", "Calculate SLA due dates and show filters, indicators and an audit trail.", "Separate domain, application and infrastructure concerns, then add tests, logs and automated deployment."],
      deliverables: ["Public source-code repository with meaningful commits.", "Working online demo with seeded test accounts.", "README with setup, architecture and usage instructions.", "Architecture diagram, API collection and portfolio screenshots."],
    };
    const english = {
      software: { summary: "Build a working MVP around " + terms + " with a complete user flow that can be demonstrated in an interview.", scope: ["Define users, permissions and the main end-to-end workflow.", "Implement the interface, business rules, persistence and error handling.", "Add automated tests, sample data and a reproducible deployment.", "Document technical decisions and the steps required to run the project."], deliverables: ["Public source-code repository.", "Working demo or executable build.", "README and architecture diagram.", "Test credentials, API collection and screenshots."] },
      design: { summary: "Create a portfolio-ready case study that demonstrates " + terms + " through a realistic service redesign.", scope: ["Define the user problem, audience and project constraints.", "Research users and comparable products, then map the core journey.", "Produce flows, wireframes, a visual system and an interactive prototype.", "Run a usability test and document findings and iterations."], deliverables: ["Research summary and journey map.", "Editable design source and component library.", "Interactive prototype with the core flow.", "Short case study ready for a portfolio platform."] },
      legal: { summary: "Prepare a complete simulated legal file applying " + terms + " to a realistic small-business scenario.", scope: ["Define the parties, facts and legal question.", "Research the applicable framework and identify risks.", "Prepare the analysis matrix and supporting-document checklist.", "Draft a reasoned legal memorandum with recommendations."], deliverables: ["Case brief and timeline.", "Legal research matrix.", "Supporting-document checklist.", "Final legal memorandum in PDF."] },
      architecture: { summary: "Develop a portfolio-ready architectural proposal applying " + terms + " to a compact accessible home.", scope: ["Define the site, users, program and constraints.", "Resolve circulation, zoning and the spatial concept.", "Develop drawings, a model and key technical decisions.", "Present the proposal and verify it against the brief."], deliverables: ["Design brief and site analysis.", "Plans, sections and elevations.", "Editable model and selected views.", "Design report and final presentation board."] },
      marketing: { summary: "Create a complete launch plan for a local service using " + terms + " in a realistic campaign scenario.", scope: ["Define the audience, positioning and measurable objective.", "Create the message, channel strategy and content system.", "Prepare the publishing plan, budget assumptions and assets.", "Build a measurement dashboard and optimization plan."], deliverables: ["Campaign brief and audience profile.", "Channel and content plan.", "Editable campaign assets.", "Measurement dashboard and presentation."] },
      general: { summary: "Build a demonstrable independent project applying " + terms + " to a concrete professional problem.", scope: ["Define the problem, users and constraints.", "Develop the proposed solution and main deliverables.", "Validate the result against clear criteria.", "Document the process and lessons learned."], deliverables: ["Project brief.", "Editable working files.", "Final demonstrable output.", "Short portfolio presentation."] },
    };
    return english[domain] ?? english.general;
  }

  if (dashboardSoftware) return {
    summary: "Construir un dashboard operativo para una empresa de servicios simulada. Analistas y responsables podrán consultar datos empresariales gobernados, entender cada KPI y pasar de un indicador general a los registros que explican el resultado.",
    scope: ["Autenticar perfiles de analista y responsable con permisos distintos.", "Consumir una API REST segura mediante una capa tipada con estados de carga, vacío y error.", "Mostrar KPIs operativos con filtros por fecha, estado y responsable, además de drill-down al detalle.", dashboardArchitecture ? "Crear componentes reutilizables de gráficos, métricas, filtros y tablas dentro de una estructura frontend escalable." : "Crear componentes reutilizables de gráficos, métricas, filtros y tablas.", dashboardTesting || dashboardReview || dashboardAssisted ? [dashboardTesting ? "Añadir pruebas unitarias y de flujo" : "", dashboardReview ? "usar revisión mediante pull requests" : "", dashboardAssisted ? "documentar cómo se validó el apoyo de herramientas de IA" : ""].filter(Boolean).join(", ") + "." : "Documentar las decisiones técnicas y los criterios de validación."],
    deliverables: [dashboardTesting || dashboardReview ? "Repositorio público con ramas, pull requests y pruebas aprobadas." : "Repositorio público con historial de cambios.", "Demo en línea con cuentas de analista y responsable.", dashboardAssisted ? "README con arquitectura, definición de KPIs, instalación y validación del trabajo asistido por IA." : "README con arquitectura, definición de KPIs e instalación.", "API simulada o documentada, diccionario de datos y capturas para portafolio."],
  };
  if (cloudSoftware) return {
    summary: "Construir un MVP profesional que un reclutador pueda abrir y probar. El sistema gestionará incidencias desde su registro hasta su resolución y demostrará " + terms + " mediante la arquitectura y el despliegue.",
    scope: ["Autenticar usuarios con roles de cliente, agente y administrador.", "Registrar, asignar y seguir incidencias con prioridades, estados, comentarios y archivos adjuntos.", "Calcular vencimientos de SLA y mostrar filtros, indicadores e historial de cambios.", "Separar dominio, aplicación e infraestructura; añadir pruebas, registros y despliegue automatizado."],
    deliverables: ["Repositorio público con código funcional e historial de cambios.", "Demo en línea con usuarios de prueba y datos precargados.", "README con instalación, arquitectura y guía de uso.", "Diagrama técnico, colección de API y capturas para portafolio."],
  };
  const spanish = {
    software: { summary: "Construir un MVP funcional alrededor de " + terms + " con un flujo completo que pueda demostrarse en una entrevista.", scope: ["Definir usuarios, permisos y el recorrido principal de principio a fin.", "Implementar interfaz, reglas de negocio, persistencia y manejo de errores.", "Añadir pruebas automatizadas, datos de ejemplo y un despliegue reproducible.", "Documentar decisiones técnicas y los pasos para ejecutar el proyecto."], deliverables: ["Repositorio público con código fuente.", "Demo funcional o versión ejecutable.", "README y diagrama de arquitectura.", "Credenciales de prueba, colección de API y capturas."] },
    design: { summary: "Crear un caso de estudio listo para portafolio que demuestre " + terms + " mediante el rediseño realista de un servicio.", scope: ["Definir el problema, el público y las restricciones del encargo.", "Investigar usuarios y referentes; representar el recorrido principal.", "Producir flujos, wireframes, sistema visual y prototipo navegable.", "Realizar una prueba de usabilidad y documentar hallazgos e iteraciones."], deliverables: ["Resumen de investigación y mapa de recorrido.", "Archivo editable y biblioteca de componentes.", "Prototipo interactivo del flujo principal.", "Caso breve listo para Behance o portafolio." ] },
    legal: { summary: "Preparar un expediente jurídico simulado y completo que aplique " + terms + " a un escenario verosímil de una pyme.", scope: ["Definir las partes, los hechos y la cuestión jurídica.", "Investigar el marco aplicable e identificar riesgos.", "Preparar la matriz de análisis y la lista de documentos de sustento.", "Redactar un informe jurídico razonado con recomendaciones."], deliverables: ["Ficha del caso y cronología.", "Matriz de investigación jurídica.", "Lista de documentación de sustento.", "Informe jurídico final en PDF."] },
    architecture: { summary: "Desarrollar una propuesta arquitectónica lista para portafolio que aplique " + terms + " a una vivienda compacta accesible.", scope: ["Definir terreno, usuarios, programa y restricciones.", "Resolver circulación, zonificación y concepto espacial.", "Desarrollar planos, modelo y decisiones técnicas principales.", "Presentar la propuesta y verificarla frente al encargo."], deliverables: ["Brief y análisis del lugar.", "Plantas, cortes y elevaciones.", "Modelo editable y vistas seleccionadas.", "Memoria y lámina final de presentación."] },
    health: { summary: "Desarrollar un caso educativo simulado que aplique " + terms + " sin utilizar información real de pacientes.", scope: ["Definir el escenario, los objetivos y los límites de seguridad.", "Preparar protocolo, criterios de decisión y materiales educativos.", "Simular el seguimiento y registrar decisiones.", "Revisar el resultado con criterios profesionales verificables."], deliverables: ["Ficha del caso simulado.", "Protocolo y material educativo.", "Registro de decisiones y seguimiento.", "Informe de aprendizajes y revisión."] },
    marketing: { summary: "Crear un lanzamiento completo para un servicio local aplicando " + terms + " en un escenario de campaña verosímil.", scope: ["Definir audiencia, posicionamiento y objetivo medible.", "Crear mensaje, estrategia de canales y sistema de contenidos.", "Preparar calendario, supuestos de presupuesto y piezas.", "Construir un tablero de medición y un plan de optimización."], deliverables: ["Brief de campaña y perfil de audiencia.", "Plan de canales y contenidos.", "Piezas editables de campaña.", "Tablero de medición y presentación final."] },
    finance: { summary: "Construir un caso financiero demostrable que aplique " + terms + " a una pyme simulada.", scope: ["Definir el escenario, los supuestos y las fuentes de datos.", "Preparar presupuesto, flujo de caja y controles.", "Analizar escenarios y riesgos principales.", "Presentar hallazgos y recomendaciones ejecutivas."], deliverables: ["Libro de trabajo editable.", "Modelo de presupuesto y flujo de caja.", "Panel de escenarios e indicadores.", "Resumen ejecutivo en PDF."] },
    operations: { summary: "Diseñar una mejora operativa demostrable que aplique " + terms + " al inventario de una pyme simulada.", scope: ["Mapear el proceso actual e identificar el problema.", "Diseñar el flujo futuro, roles y controles.", "Definir indicadores y un plan de implementación.", "Validar la propuesta con casos de prueba."], deliverables: ["Mapa del proceso actual y futuro.", "Matriz de responsables y controles.", "Tablero de indicadores.", "Plan de implementación y presentación."] },
    general: { summary: "Desarrollar un proyecto independiente demostrable que aplique " + terms + " a un problema profesional concreto.", scope: ["Definir el problema, los usuarios y las restricciones.", "Construir la solución y sus entregables principales.", "Validar el resultado con criterios claros.", "Documentar el proceso y los aprendizajes."], deliverables: ["Brief del proyecto.", "Archivos de trabajo editables.", "Resultado final demostrable.", "Presentación breve para portafolio."] },
  };
  return spanish[domain] ?? spanish.general;
}

export function automaticProjectSuggestions(result, targetLabel, sourceText, language = "es") {
  const missing = result.keywordMatch?.projectMissing ?? result.keywordMatch?.missing ?? [];
  if (!missing.length) return [];
  const domain = inferProfessionalDomain(sourceText, targetLabel);
  const groups = projectKeywordGroups(missing, domain);
  const source = normalize(sourceText);
  const matchedFoundation = (result.keywordMatch?.matched ?? []).filter((keyword) => /^(?:responsive design|arquitectura frontend escalable|scalable frontend architecture|git)$/i.test(keyword));
  const softwareFoundation = domain === "software"
    ? [
      /\breact(?:js|\.js)?\b/.test(source) ? "React" : /\bangular(?:js)?\b/.test(source) ? "Angular" : "",
      /\btypescript\b/.test(source) ? "TypeScript" : "",
      ...matchedFoundation,
    ].filter(Boolean)
    : [];

  return groups.map((entries, index) => {
    const keywords = entries.map((entry) => entry.label);
    const projectContext = [...new Set([...keywords, ...softwareFoundation])];
    const coveredKeywords = entries.flatMap((entry) => entry.coveredKeywords);
    const terms = joinedKeywords(keywords, language);
    const [title, bullets] = professionalProjectCopy(domain, projectContext, language);
    const plan = completeProjectPlan(domain, projectContext, language);
    const text = bullets.join(" ");
    return {
      id: "automatic-project-" + index,
      keyword: terms,
      keywords,
      coveredKeywords,
      domain,
      mode: "project",
      title,
      text,
      bullets,
      projectType: language === "es" ? "Proyecto independiente" : "Independent project",
      summary: plan.summary,
      scope: plan.scope,
      deliverables: plan.deliverables,
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
      language === "es" ? "PROYECTOS INDEPENDIENTES" : "INDEPENDENT PROJECTS",
      ...projects.flatMap((item) => [
        (language === "es" ? "Proyecto: " : "Project: ") + (item.title.trim() || item.keyword) + " — " + (item.projectType || (language === "es" ? "Proyecto independiente" : "Independent project")),
        ...(item.bullets?.length ? item.bullets : [item.text]).map((line) => "• " + line.trim()),
      ]),
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
    training: "HABILIDADES EN DESARROLLO",
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
    training: "SKILLS IN DEVELOPMENT",
    certifications: "COURSES AND CERTIFICATIONS",
    education: "EDUCATION",
    languages: "LANGUAGES",
    interests: "INTERESTS",
    other: "ADDITIONAL INFORMATION",
  },
};

const SECTION_ORDER = ["profile", "specializations", "experience", "projects", "skills", "training", "certifications", "education", "languages", "interests", "other"];

const SOFT_SKILLS = new Set([
  "Atención al detalle", "Comunicación", "Liderazgo", "Trabajo en equipo", "Resolución de problemas",
  "Pensamiento analítico", "Negociación", "Gestión de stakeholders", "Servicio al cliente", "Trabajo autónomo",
]);
const NON_SKILL_REQUIREMENTS = new Set(["Inglés", "Portugués", "Inglés C1"]);

export function adaptedSkillPlan(result) {
  const matched = [...new Set(result.keywordMatch?.matched ?? [])].filter((keyword) => !NON_SKILL_REQUIREMENTS.has(keyword));
  const missing = [...new Set(result.keywordMatch?.projectMissing ?? result.keywordMatch?.missing ?? [])].filter((keyword) => !NON_SKILL_REQUIREMENTS.has(keyword));
  return {
    supportedTechnical: matched.filter((keyword) => !SOFT_SKILLS.has(keyword)),
    supportedSoft: matched.filter((keyword) => SOFT_SKILLS.has(keyword)),
    developingTechnical: missing.filter((keyword) => !SOFT_SKILLS.has(keyword)),
    developingSoft: missing.filter((keyword) => SOFT_SKILLS.has(keyword)),
  };
}

function adaptProfile(profile, plan) {
  const base = String(profile ?? "").trim();
  if (!base) return "";
  const keywords = [...plan.supportedTechnical, ...plan.supportedSoft].map(normalize);
  if (!keywords.length) return base;
  const sentences = base.match(/[^.!?]+[.!?]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [base];
  return sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: keywords.reduce((total, keyword) => total + (normalize(sentence).includes(keyword) ? 1 : 0), 0),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ sentence }) => sentence)
    .join(" ");
}

function appendSkillRow(blocks, label, values) {
  if (!values.length) return blocks;
  return [...blocks, { type: "row", label, value: [...new Set(values)].join(" | ") }];
}

function prioritizeEntryBlocks(blocks, keywords) {
  const normalizedKeywords = keywords.map(normalize);
  return blocks.map((block) => {
    if (block.type !== "entry" || block.bullets.length < 2) return block;
    const bullets = block.bullets
      .map((text, index) => ({ text, index, score: normalizedKeywords.reduce((total, keyword) => total + (normalize(text).includes(keyword) ? 1 : 0), 0) }))
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .map(({ text }) => text);
    return { ...block, bullets };
  });
}

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
  const skillPlan = adaptedSkillPlan(result);
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
  const profile = adaptProfile(recoverProfileText(grouped.get("profile") ?? [], parsed.header, name, headline), skillPlan);
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
    const generatedSkills = kind === "skills" && !lines.length && (skillPlan.supportedTechnical.length || skillPlan.supportedSoft.length);
    const generatedTraining = false;
    if (!lines.length && !recoveredBlocks?.length && !generatedSkills && !generatedTraining) continue;
    if (kind === "experience" || kind === "projects") lines = prioritizeSectionLines(lines, matched, language);
    else lines = lines.map(normalizeResumeDates);
    let blocks = recoveredBlocks ?? sectionBlocks(kind, lines, language);
    if ((kind === "experience" || kind === "projects") && recoveredBlocks) blocks = prioritizeEntryBlocks(blocks, matched);
    if (kind === "skills") {
      blocks = skillBlocks(lines, language);
      if (!lines.length) {
        blocks = appendSkillRow(blocks, language === "es" ? "Habilidades relevantes" : "Relevant skills", skillPlan.supportedTechnical);
        blocks = appendSkillRow(blocks, language === "es" ? "Competencias" : "Strengths", skillPlan.supportedSoft);
      }
    }
    if (kind === "training") {
      blocks = sectionBlocks(kind, lines, language);
    }
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
