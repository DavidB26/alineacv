const sectionNames = [
  ["profile", /^(perfil(?: profesional)?|resumen(?: profesional)?|objetivo(?: profesional)?|professional summary|summary|profile|objective)$/i],
  ["experience", /^(experiencia(?: profesional| laboral)?|trayectoria profesional|professional experience|work experience|employment|work history)$/i],
  ["education", /^(educacion|formacion(?: academica)?|estudios|education|academic background)$/i],
  ["skills", /^(habilidades(?: tecnicas)?|competencias(?: tecnicas)?|tecnologias|technical skills|skills|competencies|tools)$/i],
  ["projects", /^(proyectos(?: personales| destacados)?|projects)$/i],
  ["certifications", /^(certificaciones|cursos(?: y certificaciones)?|certifications|courses)$/i],
  ["languages", /^(idiomas|languages)$/i],
  ["other", /^(referencias|publicaciones|voluntariado|informacion adicional|references|publications|volunteering|additional information)$/i],
];

export function reorganizeResume(sourceText) {
  const header = [];
  const sections = [];
  let current = null;
  for (const original of sourceText.split(/\r?\n/)) {
    const line = original.trim();
    if (!line) continue;
    const normalized = line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/:$/, "").trim();
    const kind = sectionNames.find(([, pattern]) => pattern.test(normalized));
    if (kind) {
      current = { kind: kind[0], heading: line, lines: [], order: sections.length };
      sections.push(current);
    } else if (current) current.lines.push(line);
    else header.push(line);
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
