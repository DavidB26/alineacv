import assert from "node:assert/strict";
import test from "node:test";
import { analyzeResume } from "../app/analizar-cv/analysis.mjs";
import {
  adaptedSkillPlan,
  adaptedVersionName,
  appendConfirmedEvidence,
  automaticProjectSuggestions,
  buildAdaptedResume,
  inferProfessionalDomain,
  missingKeywordProposals,
  normalizeResumeDates,
  polishResumeBullet,
  splitResumeEntry,
} from "../app/analizar-cv/adapted-resume.mjs";

const legalResume = `Andrea Salazar
+51 999 111 222 · andrea@example.com · Lima, Perú
Abogada junior
PERFIL PROFESIONAL
Abogada con experiencia en revisión de contratos.
EXPERIENCIA PROFESIONAL
Asistente legal · Estudio Rivera · mayo 2022 — Presente
• Revisé contratos y preparé expedientes para el equipo legal mediante coordinación interna,
FORMACIÓN ACADÉMICA
Universidad Nacional · 2017 — 2022
HABILIDADES
Redacción, investigación
IDIOMAS
Inglés intermedio`;

const legalVacancy = `Puesto: Abogada corporativa
Empresa: Empresa Andina
Requisitos: derecho corporativo, contratos, cumplimiento normativo, debida diligencia e investigación jurídica.`;

test("detects professional domains outside software and drafts relevant projects", () => {
  assert.equal(inferProfessionalDomain(legalResume, "Abogada corporativa"), "legal");
  assert.equal(inferProfessionalDomain("Revit, BIM y supervisión de obra", "Arquitecta"), "architecture");
  assert.equal(inferProfessionalDomain("Figma e identidad visual", "Diseñador"), "design");
  assert.equal(inferProfessionalDomain("Figma, SEO y campañas", "Desarrollador Full Stack"), "software");
  assert.equal(inferProfessionalDomain("Diseñador gráfico con Figma e Illustrator", "Backend Developer"), "software");

  const result = analyzeResume(legalResume, legalVacancy, "es");
  const proposals = missingKeywordProposals(result, "Abogada corporativa", legalResume, "es");
  assert.ok(proposals.length >= 1);
  assert.ok(proposals.every((proposal) => proposal.domain === "legal"));
  assert.ok(proposals.every((proposal) => proposal.project.text.includes(proposal.keyword)));
  assert.ok(proposals.every((proposal) => /caso práctico|marco aplicable|criterio jurídico/i.test(proposal.project.text)));
});

test("adds only evidence explicitly confirmed by the user", () => {
  const proposals = [
    { keyword: "Cumplimiento normativo", mode: "project", title: "Caso de compliance", text: "Analizar un caso real de cumplimiento normativo.", included: true },
    { keyword: "Debida diligencia", mode: "project", title: "Caso de due diligence", text: "Analizar documentación societaria.", included: false },
    { keyword: "Inglés", mode: "learning", title: "", text: "Inglés en desarrollo mediante formación guiada.", included: true },
  ];
  const adapted = appendConfirmedEvidence(legalResume, proposals, "es");
  assert.match(adapted, /Caso de compliance/);
  assert.match(adapted, /FORMACIÓN Y HABILIDADES EN DESARROLLO/);
  assert.doesNotMatch(adapted, /Caso de due diligence/);
});

test("generates offer-specific projects and includes them in the complete adapted resume", () => {
  const result = analyzeResume(legalResume, legalVacancy, "es");
  const projects = automaticProjectSuggestions(result, "Abogada corporativa", legalResume, "es");
  assert.ok(projects.length >= 1 && projects.length <= 2);
  assert.deepEqual(projects.flatMap((project) => project.coveredKeywords).sort(), [...result.keywordMatch.missing].sort());
  assert.ok(projects.every((project) => project.included && project.mode === "project"));
  assert.ok(projects.every((project) => project.bullets.every((bullet) => /^(Delimitar|Analizar|Redactar|Definir|Desarrollar|Preparar|Construir|Diseñar|Documentar)\b/.test(bullet))));
  for (const project of projects) {
    for (const keyword of project.keywords) assert.match(project.title + " " + project.text, new RegExp(keyword, "i"));
  }

  const completeText = appendConfirmedEvidence(legalResume, projects, "es");
  assert.match(completeText, /Andrea Salazar/);
  assert.match(completeText, /Revisé contratos y preparé expedientes/);
  assert.match(completeText, /PROYECTOS INDEPENDIENTES/);
  for (const keyword of result.keywordMatch.missing) assert.match(completeText, new RegExp(keyword, "i"));

  const originalScore = result.score;
  const document = buildAdaptedResume(completeText, result, "Abogada corporativa", "es");
  assert.equal(result.score, originalScore);
  assert.match(document.plainText, /Andrea Salazar/);
  assert.match(document.plainText, /Revisar contratos y preparé expedientes/);
  assert.match(document.plainText, /PROYECTOS RELEVANTES/);
  for (const project of projects) assert.match(document.plainText, new RegExp(project.title, "i"));
});

test("builds the one-column reference structure without truncating source bullets", () => {
  const result = analyzeResume(legalResume, legalVacancy, "es");
  const adapted = buildAdaptedResume(legalResume, result, "Abogada corporativa", "es");
  assert.equal(adapted.name, "Andrea Salazar");
  assert.equal(adapted.headline, "Abogada junior");
  assert.ok(adapted.contactLines.some((line) => line.includes("andrea@example.com")));
  assert.deepEqual(adapted.sections.slice(0, 3).map((section) => section.kind), ["profile", "experience", "skills"]);
  assert.match(adapted.plainText, /PERFIL PROFESIONAL/);
  assert.doesNotMatch(adapted.plainText, /ÁREAS DE ESPECIALIZACIÓN/);
  assert.match(adapted.plainText, /Revisar contratos y preparé expedientes para el equipo legal mediante coordinación interna\./);
  assert.doesNotMatch(adapted.plainText, /mediante\s*$/m);
  assert.doesNotMatch(adapted.plainText, /\.\.\./);
});

test("keeps original specializations compact and uses the original headline for a generic job label", () => {
  const source = `David Beslanga Rabanal
Desarrollador Web | WordPress y Frontend
david@example.com
PERFIL PROFESIONAL
Desarrollador con experiencia en productos digitales.
ÁREAS DE ESPECIALIZACIÓN
WordPress y PHP | Frontend responsive
SEO técnico | Analítica
EXPERIENCIA PROFESIONAL
Frontend Developer · 2022 — Presente
• Desarrollar interfaces accesibles.`;
  const result = analyzeResume(source, "Requisitos: Angular, Java y Selenium", "es");
  const document = buildAdaptedResume(source, result, "Vacante analizada", "es");
  assert.equal(document.headline, "Desarrollador Web | WordPress y Frontend");
  const specialization = document.sections.find((section) => section.kind === "specializations");
  assert.equal(specialization.blocks.length, 1);
  assert.match(document.plainText, /WordPress y PHP \| Frontend responsive \| SEO técnico \| Analítica/);
  assert.doesNotMatch(document.plainText, /ÁREAS DE ESPECIALIZACIÓN[\s\S]*Angular[\s\S]*EXPERIENCIA PROFESIONAL/);
});

test("writes software projects as coherent infinitive actions for each tool role", () => {
  const source = `Diego Ruiz
Desarrollador web
diego@example.com
PERFIL PROFESIONAL
Desarrollador de aplicaciones.
HABILIDADES TÉCNICAS
HTML, CSS
EXPERIENCIA PROFESIONAL
Desarrollador · 2022 — Presente
• Construir interfaces web.`;
  const vacancy = "Requisitos: Angular, Java, Selenium, SVN, BD e IA.";
  const result = analyzeResume(source, vacancy, "es");
  const projects = automaticProjectSuggestions(result, "Desarrollador Full Stack", source, "es");
  assert.equal(projects.length, 1);
  assert.equal(projects[0].title, "Aplicación web con Angular y Java");
  assert.match(projects[0].text, /^Construir .*Angular.*Java.*BD\. Incorporar .*Inteligencia artificial.*\. Automatizar .*Selenium\. Gestionar .*SVN\. Documentar /);
  assert.ok(projects.every((project) => project.text.split(/(?<=\.)\s+/).every((sentence) => /^(Construir|Automatizar|Incorporar|Gestionar|Integrar|Documentar)\b/.test(sentence))));
});

test("creates one real dashboard project from related frontend vacancy gaps", () => {
  const source = `David Beslanga
Desarrollador frontend con 8 años de experiencia
david@example.com | Lima, Perú
EXPERIENCIA PROFESIONAL
• Implementar componentes responsive y reutilizables con React y TypeScript.
HABILIDADES
Frontend: HTML5, CSS3, TypeScript, React y Responsive Design. | Backend y datos: PHP, MySQL y Firebase. | Herramientas: Git y GitHub.
FORMACIÓN ACADÉMICA
Bachiller en Ingeniería de Sistemas
IDIOMAS
Inglés: intermedio`;
  const vacancy = `Inglés C1 avanzado. +6 años de experiencia en desarrollo Front-End.
React o Angular, TypeScript, HTML5, CSS3 y Responsive Design.
Dashboards orientados a datos, APIs REST seguras, conceptos BI, KPIs, filtros, drill-down y datos gobernados.
Componentes reutilizables, arquitectura frontend escalable, Git, testing y code review.
Herramientas de desarrollo asistidas por IA como GitHub Copilot, ChatGPT o Claude.`;
  const result = analyzeResume(source, vacancy, "es");
  const projects = automaticProjectSuggestions(result, "Vacante analizada", source, "es");

  assert.equal(projects.length, 1);
  assert.equal(projects[0].title, "Dashboard empresarial de operaciones y KPIs");
  assert.equal(projects[0].bullets.length, 4);
  assert.ok(projects[0].keywords.includes("API REST"));
  assert.ok(projects[0].keywords.includes("Desarrollo asistido por IA"));
  assert.ok(!projects[0].keywords.includes("Inglés C1"));
  assert.match(projects[0].summary, /datos empresariales gobernados/i);
  assert.match(projects[0].text, /React y TypeScript/);
  assert.match(projects[0].text, /API REST segura/);
  assert.match(projects[0].text, /drill-down/);
  assert.doesNotMatch(projects[0].text, /Proyecto técnico con|\bC1\b/);

  const complete = appendConfirmedEvidence(source, projects, "es");
  const document = buildAdaptedResume(complete, result, "Vacante analizada", "es");
  const skills = document.sections.find((section) => section.kind === "skills");
  assert.deepEqual(skills.blocks.map((block) => block.label), ["Frontend", "Backend y datos", "Herramientas", "Alineadas con la oferta"]);
  assert.doesNotMatch(document.plainText, /Herramientas: Frontend:/);
});

test("adapts a resume to full technical coverage without inventing projects or eligibility", () => {
  const source = `David Beslanga
51 999 111 222 | david@example.com | Lima, Perú
Desarrollador frontend con 8 años de experiencia
PERFIL PROFESIONAL
Especialista en interfaces web y optimización de rendimiento.
EXPERIENCIA PROFESIONAL
Frontend Developer · Empresa Real · 2020 — Presente
• Coordinar entregas con el equipo de producto.
• Implementar componentes reutilizables con React y TypeScript.
HABILIDADES
React | TypeScript | Git | Comunicación | Trabajo en equipo
FORMACIÓN ACADÉMICA
Bachiller en Ingeniería de Sistemas
IDIOMAS
Inglés intermedio`;
  const vacancy = `Inglés C1 avanzado. React o Angular, TypeScript, API REST, Git, testing, code review, comunicación y trabajo en equipo.`;
  const result = analyzeResume(source, vacancy, "es");
  const plan = adaptedSkillPlan(result);
  const document = buildAdaptedResume(source, result, "Frontend Developer", "es");

  assert.deepEqual(new Set(plan.supportedTechnical), new Set(["TypeScript", "Git", "React o Angular"]));
  assert.deepEqual(plan.supportedSoft, ["Comunicación", "Trabajo en equipo"]);
  assert.ok(plan.developingTechnical.includes("API REST"));
  assert.ok(plan.developingTechnical.includes("Testing"));
  assert.ok(plan.developingTechnical.includes("Code review"));
  assert.ok(![...plan.supportedTechnical, ...plan.developingTechnical].includes("Inglés C1"));
  assert.doesNotMatch(document.plainText, /PROYECTOS (?:INDEPENDIENTES|RELEVANTES)/);
  assert.match(document.plainText, /HABILIDADES EN DESARROLLO/);
  assert.match(document.plainText, /Habilidades técnicas en desarrollo: [^\n]*Testing[^\n]*Code review[^\n]*API REST/);
  assert.match(document.plainText, /Frontend Developer · Empresa Real/);
  assert.match(document.plainText, /• Implementar componentes reutilizables con React y TypeScript\.[\s\S]*• Coordinar entregas/);
  assert.match(document.plainText, /Experiencia demostrada en/);
});

test("turns Azure and SOLID into one complete demonstrable project and exports only its concise version", () => {
  const source = "Lucía Torres\nDesarrolladora backend\nlucia@example.com\nHABILIDADES\nJava y SQL";
  const result = analyzeResume(source, "Puesto: Backend Developer\nRequisitos: Azure y SOLID.", "es");
  const projects = automaticProjectSuggestions(result, "Backend Developer", source, "es");

  assert.equal(projects.length, 1);
  assert.equal(projects[0].title, "Sistema de gestión de incidencias con SLA");
  assert.equal(projects[0].projectType, "Proyecto independiente");
  assert.match(projects[0].summary, /MVP profesional/);
  assert.ok(projects[0].scope.some((item) => /roles de cliente, agente y administrador/i.test(item)));
  assert.ok(projects[0].deliverables.some((item) => /Demo en línea/i.test(item)));
  assert.match(projects[0].text, /Azure/);
  assert.match(projects[0].text, /SOLID/);

  const completeText = appendConfirmedEvidence(source, projects, "es");
  assert.match(completeText, /Sistema de gestión de incidencias con SLA — Proyecto independiente/);
  assert.match(completeText, /PROYECTOS INDEPENDIENTES/);
  assert.doesNotMatch(completeText, /usuarios de prueba y datos precargados/);
});

test("normalizes dates and keeps all bullet text", () => {
  assert.equal(normalizeResumeDates("mayo 2022 — Presente"), "05/2022 — Presente");
  assert.deepEqual(splitResumeEntry("Asistente legal · mayo 2022 — Presente"), {
    title: "Asistente legal",
    date: "05/2022 - Presente",
  });
  const long = "Desarrollé " + "un análisis jurídico completo mediante evidencia documental ".repeat(30) + "para sustentar la conclusión";
  const polished = polishResumeBullet(long, "es");
  assert.ok(polished.length > 1_500);
  assert.match(polished, /^Desarrollar /);
  assert.match(polished, /sustentar la conclusión\.$/);
});

test("names each application version with company and role", () => {
  assert.equal(adaptedVersionName("Abogada corporativa", "Empresa Andina", "es"), "CV - Empresa Andina - Abogada corporativa");
  assert.equal(adaptedVersionName("Diseñadora UX", "", "es"), "CV - Diseñadora UX");
});

test("reconstructs a graphic Adobe resume instead of exporting its visual reading order", () => {
  const source = [
    "CURRÍCULUM", "Hola,", "soy Genith!",
    "Soy diseñadora gráfica y actualmente curso el", "último año de la carrera. Vivo en Lima y",
    "disfruto aprender de manera constante, tanto", "dentro como fuera del ámbito académico. Mi",
    "principal interés es la ilustración, área en la que", "busco desarrollarme y construir mi identidad", "profesional.",
    "https://www.behance.net/genithmelendez", "EXPERIENCIA", "Diseño Web (Tottus)",
    "2023 Encargada de realizar el mantenimiento", "de los principales home, creación de",
    "landing pages según campañas con la", "herramienta contentstack", "Diseñadora Gráfica (Lingo)", "2025",
    "Encargada de realizar piezas gráficas", "para distintos proyectos y rediseño de la", "web actual.",
    "Packaging Ilustración", "Branding", "SOFTWARE", "Adobe XD", "Adobe Photoshop", "Adobe Illustrator",
    "Adobe Indesign", "App Figma", "App Procreate", "LENGUAJE", "Inglés Intermedio", "Español Nativo",
    "HOBBIES", "Baile y música", "Pintura y arte digital", "Gym", "CONTACTO", "Lima, Perú",
    "gen.nith123@gmail.com", "+51 912 317 162",
  ].join("\n");
  const result = analyzeResume(source, "Puesto: Diseñadora gráfica\nRequisitos: Figma, Photoshop, branding e ilustración.", "es");
  const document = buildAdaptedResume(source, result, "Diseñadora gráfica", "es", { fileName: "CV - Genith Barrera (1).pdf" });
  assert.equal(document.name, "Genith Barrera");
  assert.equal(document.headline, "Diseñadora gráfica");
  assert.deepEqual(document.contactLines.slice(0, 3), ["+51 912 317 162", "gen.nith123@gmail.com", "Lima, Perú"]);
  assert.match(document.plainText, /PERFIL PROFESIONAL[\s\S]*construir mi identidad profesional\./);
  assert.match(document.plainText, /Diseño Web \(Tottus\) \| 2023[\s\S]*Realizar el mantenimiento/);
  assert.match(document.plainText, /Diseñadora Gráfica \(Lingo\) \| 2025[\s\S]*Realizar piezas gráficas/);
  assert.match(document.plainText, /Packaging \| Ilustración \| Branding/);
  assert.match(document.plainText, /Herramientas: Adobe XD \| Adobe Photoshop \| Adobe Illustrator \| Adobe InDesign \| Figma \| Procreate/);
  assert.match(document.plainText, /Inglés: Intermedio[\s\S]*Español: Nativo/);
  assert.match(document.plainText, /Baile y música \| Pintura y arte digital \| Gym/);
});

test("separates a graphic designer headline from the complete personal profile", () => {
  const source = [
    "CURRÍCULUM", "Hola,", "soy Genith!",
    "Soy diseñadora gráfica y actualmente curso el", "último año de la carrera. Vivo en Lima y",
    "disfruto aprender de manera constante, tanto", "dentro como fuera del ámbito académico. Mi",
    "principal interés es la ilustración, área en la que", "busco desarrollarme y construir mi identidad", "profesional.",
    "EXPERIENCIA", "Diseñadora Gráfica (Lingo)", "2025", "Encargada de realizar piezas gráficas.",
  ].join("\n");
  const result = analyzeResume(source, "Requisitos: UI/UX e investigación de usuarios.", "es");
  const document = buildAdaptedResume(source, result, "Convocatoria cargada", "es", { fileName: "CV - Genith Barrera.pdf" });
  assert.equal(document.headline, "Diseñadora gráfica");
  const profile = document.sections.find((section) => section.kind === "profile");
  assert.match(profile.blocks[0].text, /^Soy diseñadora gráfica y actualmente curso el último año de la carrera\./);
  assert.match(profile.blocks[0].text, /construir mi identidad profesional\.$/);
});

test("creates one concrete UX project and removes duplicate requirement labels", () => {
  const result = {
    score: 42,
    keywordMatch: {
      matched: [],
      missing: ["UI/UX", "UX y UI", "UX", "UI", "Investigación de usuarios", "Investigación", "Comunicación", "Prototipado"],
    },
  };
  const source = "Genith Barrera\nSoy diseñadora gráfica.\nHABILIDADES\nAdobe Illustrator, Figma";
  const projects = automaticProjectSuggestions(result, "Especialista en campañas publicitarias", source, "es");
  assert.equal(projects.length, 1);
  assert.equal(projects[0].domain, "design");
  assert.equal(projects[0].title, "Rediseño UX/UI de una plataforma de servicios");
  assert.deepEqual(projects[0].keywords, ["UI/UX", "Investigación de usuarios", "Comunicación", "Prototipado"]);
  assert.deepEqual(projects[0].coveredKeywords.sort(), [...result.keywordMatch.missing].sort());
  assert.ok(projects[0].bullets.every((bullet) => /^(Definir|Investigar|Diseñar|Validar)\b/.test(bullet)));
  assert.match(projects[0].text, /prototipo navegable/);
  assert.match(projects[0].text, /prueba de usabilidad/);

  const completeText = appendConfirmedEvidence(source, projects, "es");
  assert.equal((completeText.match(/^• /gm) ?? []).length, projects[0].bullets.length);
  assert.doesNotMatch(completeText, /Investigación de usuarios e Investigación/);
});

test("recovers the complete identity, employment and education from a glyph-fragmented PDF", () => {
  const source = [
    "RUBEN DARIO R.", "DISEÑADOR SR. / CREADOR DE CONTENIDO / IA / 3D", "SOBRE MÍ",
    "Mi nombre es Ruben Dario Rivera Llanos. Tengo 32 años y soy Diseñador gráfico especializado en Publicidad. Más de 7 años creando soluciones visuales innovadoras para publicidad y redes sociales.",
    "EXPERIENCIA LABORAL", "LAGROUP", "Diseñador Gráfico Publicitario / 3D", "2012-2015",
    "CMARTY PUBLICIDAD", "Diseñador Gráfico Publicitario", "2015-2016", "GRUPO DOMO",
    "Diseñador Gráfico Publicitario / 3D", "2017-2018", "ELECTO", "2019-2020 Diseñador Gráfico Junior",
    "MAKE PUBLICIDAD", "2020-2025 Diseñador Gráfico Senior", "EDUCACIÓN", "COLEGIO “ EL NAZARENO “",
    "Educación Inicial, Primaria y Secundaria1998-2009", "ISIL ( INSTITUTO SAN IGNACIO DE LA OYOLA )",
    "Estudios de diseño Gráfico2010-2015", "CAD + BIN CENTER ( 3D VRAY)", "Estudios de diseño 3D2015-2016",
    "HABILIDADES", "Puntualidad - Honestidad - Proactivo - Paciencia - Resolución de problemas",
    "Telefono 983030491 Email rubendario480@gmail.com", "SOFTWARE SKILL", "Adobe photoshop", "After Effects",
    "3D Max", "Adobe Illustrator", "Adobe Indesign", "Figma", "Behance Porta behance.net/rubndarorivera",
  ].join("\n");
  const result = analyzeResume(source, "Requisitos: Figma, Photoshop, Illustrator, publicidad, diseño 3D e IA.", "es");
  const document = buildAdaptedResume(source, result, "Figma, Photoshop, Illustrator, publicidad, diseño 3D e IA", "es", { fileName: "CV_Ruben_2026.pdf" });
  assert.equal(document.name, "Ruben Dario Rivera Llanos");
  assert.equal(document.headline, "DISEÑADOR SR. / CREADOR DE CONTENIDO / IA / 3D");
  assert.equal(document.sections.find((section) => section.kind === "experience").blocks.length, 5);
  assert.match(document.plainText, /Diseñador Gráfico Senior \| MAKE PUBLICIDAD \| 2020 - 2025/);
  assert.match(document.plainText, /ISIL \( INSTITUTO SAN IGNACIO DE LA OYOLA \) \| 2010 - 2015/);
  assert.match(document.plainText, /Herramientas: Adobe Photoshop \| After Effects \| 3D Max \| Adobe Illustrator \| Adobe InDesign \| Figma/);
  assert.doesNotMatch(document.plainText, /RUBE N DARI O/);
});
