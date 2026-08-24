"use client";

/* eslint-disable @next/next/no-img-element -- Resume photos are local data URLs and must never be sent to an image optimizer. */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Language = "es" | "en";
type SectionKey = "personal" | "education" | "experience" | "skills";
type TemplateId = "classic" | "photo-center" | "photo-side";

type Personal = {
  fullName: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  summary: string;
  photo: string;
};

type Education = {
  id: string;
  institution: string;
  degree: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
};

type Experience = {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  responsibilities: string;
};

type Certification = {
  id: string;
  name: string;
  date: string;
};

type Skills = {
  technical: string;
  languages: string;
  additional: string;
  certifications: Certification[];
};

type ResumeData = {
  personal: Personal;
  education: Education[];
  experience: Experience[];
  skills: Skills;
};

const dictionary = {
  es: {
    eyebrow: "Creador de CV gratuito",
    heroTitle: "Tu experiencia, bien alineada.",
    heroBody: "Crea un CV Harvard profesional, legible y preparado para procesos de selección.",
    privacy: "Tus datos se guardan solo en este dispositivo.",
    builderNav: "Crear CV",
    analyzerNav: "Analizar CV",
    editorTitle: "Construye tu CV",
    preview: "Vista previa",
    template: "Elige una plantilla",
    templateHint: "Podrás cambiarla sin perder tu información.",
    classic: "Harvard Classic",
    classicDescription: "Tradicional, sobria y sin fotografía.",
    photoCenter: "Harvard Photo",
    photoCenterDescription: "Fotografía central y estructura clásica.",
    photoSide: "Harvard Split",
    photoSideDescription: "Fotografía y datos en una columna lateral.",
    free: "Gratis",
    personal: "Personal",
    education: "Educación",
    experience: "Experiencia",
    skills: "Habilidades técnicas",
    step: "Paso",
    of: "de",
    save: "Guardar",
    saved: "Guardado",
    saving: "Guardando…",
    example: "Cargar ejemplo",
    export: "Exportar PDF",
    edit: "Editar",
    view: "Ver CV",
    previous: "Anterior",
    next: "Siguiente",
    finish: "Revisar CV",
    photo: "Fotografía",
    photoHelp: "PNG, JPG o WebP. Máximo 2 MB.",
    uploadPhoto: "Subir foto",
    removePhoto: "Quitar",
    fullName: "Nombre completo",
    professionalRole: "Título profesional",
    email: "Correo electrónico",
    phone: "Teléfono",
    location: "Ciudad, país",
    website: "Sitio web",
    linkedin: "LinkedIn",
    summary: "Perfil profesional",
    summaryHelp: "Resume tu especialidad, experiencia y mayor aporte en 3–5 líneas.",
    institution: "Institución",
    degree: "Título o grado",
    startDate: "Fecha de inicio",
    endDate: "Fecha de fin",
    educationDescription: "Descripción o logros",
    addEducation: "Añadir educación",
    educationEntry: "Formación",
    company: "Empresa u organización",
    position: "Cargo",
    responsibilities: "Responsabilidades y logros",
    responsibilitiesHelp: "Usa una línea por logro e incluye resultados medibles cuando sea posible.",
    addExperience: "Añadir experiencia",
    experienceEntry: "Experiencia",
    noExperience: "Aún no tengo experiencia laboral",
    technicalSkills: "Habilidades técnicas",
    technicalHelp: "Separa cada habilidad con una coma y conserva su nivel, por ejemplo: React (avanzado), SQL (intermedio).",
    languages: "Idiomas",
    certifications: "Certificaciones y licencias",
    certificationName: "Nombre de la certificación",
    certificationDate: "Fecha",
    addCertification: "Añadir certificación",
    additionalSkills: "Habilidades adicionales e intereses",
    delete: "Eliminar",
    present: "Actualidad",
    previewName: "Tu nombre",
    previewRole: "Tu título profesional",
    profileSection: "Perfil profesional",
    experienceSection: "Experiencia profesional",
    educationSection: "Educación",
    skillsSection: "Habilidades",
    languagesSection: "Idiomas",
    certificationsSection: "Certificaciones",
    contactSection: "Contacto",
    emptyProfile: "Añade un breve perfil para presentar tu experiencia y fortalezas.",
    emptyEntry: "Completa esta sección desde el editor.",
    photoAlt: "Fotografía profesional",
    printMissingName: "Añade tu nombre antes de exportar el PDF.",
    photoTooLarge: "La fotografía debe pesar menos de 2 MB.",
    sampleLoaded: "Ejemplo cargado. Puedes reemplazar todos los datos.",
    manualSaved: "Tu CV quedó guardado en este dispositivo.",
  },
  en: {
    eyebrow: "Free resume builder",
    heroTitle: "Your experience, properly aligned.",
    heroBody: "Create a professional, readable Harvard resume built for hiring processes.",
    privacy: "Your information is saved only on this device.",
    builderNav: "Build resume",
    analyzerNav: "Check resume",
    editorTitle: "Build your resume",
    preview: "Live preview",
    template: "Choose a template",
    templateHint: "Switch templates without losing your information.",
    classic: "Harvard Classic",
    classicDescription: "Traditional, polished and photo-free.",
    photoCenter: "Harvard Photo",
    photoCenterDescription: "Centered photo with a classic structure.",
    photoSide: "Harvard Split",
    photoSideDescription: "Photo and details in a compact sidebar.",
    free: "Free",
    personal: "Personal",
    education: "Education",
    experience: "Experience",
    skills: "Technical skills",
    step: "Step",
    of: "of",
    save: "Save",
    saved: "Saved",
    saving: "Saving…",
    example: "Load example",
    export: "Export PDF",
    edit: "Edit",
    view: "View resume",
    previous: "Previous",
    next: "Next",
    finish: "Review resume",
    photo: "Photo",
    photoHelp: "PNG, JPG or WebP. 2 MB maximum.",
    uploadPhoto: "Upload photo",
    removePhoto: "Remove",
    fullName: "Full name",
    professionalRole: "Professional title",
    email: "Email",
    phone: "Phone",
    location: "City, country",
    website: "Website",
    linkedin: "LinkedIn",
    summary: "Professional profile",
    summaryHelp: "Summarize your specialty, experience and strongest contribution in 3–5 lines.",
    institution: "Institution",
    degree: "Degree",
    startDate: "Start date",
    endDate: "End date",
    educationDescription: "Description or achievements",
    addEducation: "Add education",
    educationEntry: "Education",
    company: "Company or organization",
    position: "Position",
    responsibilities: "Responsibilities and achievements",
    responsibilitiesHelp: "Use one line per achievement and add measurable results when possible.",
    addExperience: "Add experience",
    experienceEntry: "Experience",
    noExperience: "I do not have work experience yet",
    technicalSkills: "Technical skills",
    technicalHelp: "Separate each skill with a comma and keep its level, for example: React (advanced), SQL (intermediate).",
    languages: "Languages",
    certifications: "Certifications and licenses",
    certificationName: "Certification name",
    certificationDate: "Date",
    addCertification: "Add certification",
    additionalSkills: "Additional skills and interests",
    delete: "Delete",
    present: "Present",
    previewName: "Your name",
    previewRole: "Your professional title",
    profileSection: "Professional profile",
    experienceSection: "Professional experience",
    educationSection: "Education",
    skillsSection: "Skills",
    languagesSection: "Languages",
    certificationsSection: "Certifications",
    contactSection: "Contact",
    emptyProfile: "Add a short profile to introduce your experience and strengths.",
    emptyEntry: "Complete this section from the editor.",
    photoAlt: "Professional portrait",
    printMissingName: "Add your name before exporting the PDF.",
    photoTooLarge: "Your photo must be smaller than 2 MB.",
    sampleLoaded: "Example loaded. You can replace every detail.",
    manualSaved: "Your resume is saved on this device.",
  },
} as const;

type Copy = (typeof dictionary)[Language];

const sections: SectionKey[] = ["personal", "education", "experience", "skills"];

function createBlankResume(): ResumeData {
  return {
    personal: {
      fullName: "",
      role: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      linkedin: "",
      summary: "",
      photo: "",
    },
    education: [
      { id: "education-1", institution: "", degree: "", location: "", startDate: "", endDate: "", description: "" },
    ],
    experience: [
      { id: "experience-1", company: "", position: "", location: "", startDate: "", endDate: "", responsibilities: "" },
    ],
    skills: {
      technical: "",
      languages: "",
      additional: "",
      certifications: [{ id: "certification-1", name: "", date: "" }],
    },
  };
}

function createSampleResume(language: Language): ResumeData {
  const spanish = language === "es";
  return {
    personal: {
      fullName: spanish ? "Camila Torres" : "Jordan Miller",
      role: spanish ? "Especialista en Marketing Digital" : "Digital Marketing Specialist",
      email: spanish ? "camila.torres@email.com" : "jordan.miller@email.com",
      phone: spanish ? "+51 987 654 321" : "+1 617 555 0148",
      location: spanish ? "Lima, Perú" : "Boston, MA",
      website: "portafolio.com",
      linkedin: spanish ? "linkedin.com/in/camilatorres" : "linkedin.com/in/jordanmiller",
      summary: spanish
        ? "Especialista en marketing digital con más de cinco años de experiencia desarrollando estrategias de crecimiento, contenido y adquisición. Enfocada en convertir datos en decisiones que mejoran el rendimiento comercial."
        : "Digital marketing specialist with five years of experience building growth, content and acquisition strategies. Focused on turning data into decisions that improve commercial performance.",
      photo: "",
    },
    education: [
      {
        id: "education-sample",
        institution: spanish ? "Universidad de Lima" : "Boston University",
        degree: spanish ? "Licenciatura en Comunicación y Marketing" : "Bachelor of Science in Marketing",
        location: spanish ? "Lima, Perú" : "Boston, MA",
        startDate: "2014",
        endDate: "2019",
        description: spanish ? "Décimo superior. Proyecto final enfocado en estrategia digital." : "Dean's List. Capstone project focused on digital strategy.",
      },
    ],
    experience: [
      {
        id: "experience-sample-1",
        company: spanish ? "Nexo Digital" : "Northstar Digital",
        position: spanish ? "Especialista de Growth Marketing" : "Growth Marketing Specialist",
        location: spanish ? "Lima, Perú" : "Boston, MA",
        startDate: spanish ? "Mar 2022" : "Mar 2022",
        endDate: spanish ? "Actualidad" : "Present",
        responsibilities: spanish
          ? "Aumenté en 38% los leads calificados mediante campañas multicanal.\nReduje el costo de adquisición en 21% usando pruebas A/B y segmentación.\nCoordiné proyectos con equipos de ventas, diseño y producto."
          : "Increased qualified leads by 38% through multichannel campaigns.\nReduced acquisition cost by 21% using A/B testing and segmentation.\nCoordinated projects across sales, design and product teams.",
      },
      {
        id: "experience-sample-2",
        company: spanish ? "Estudio Horizonte" : "Horizon Studio",
        position: spanish ? "Analista de Marketing" : "Marketing Analyst",
        location: spanish ? "Lima, Perú" : "Cambridge, MA",
        startDate: "2019",
        endDate: "2022",
        responsibilities: spanish
          ? "Construí reportes ejecutivos para optimizar inversión en medios.\nGestioné el calendario de contenidos y campañas para ocho clientes."
          : "Built executive reports to optimize media investment.\nManaged content calendars and campaigns for eight client accounts.",
      },
    ],
    skills: {
      technical: "Google Analytics, SEO, Google Ads, HubSpot, Looker Studio, Excel",
      languages: spanish ? "Español (nativo), Inglés (avanzado)" : "English (native), Spanish (professional)",
      additional: spanish ? "Liderazgo, comunicación, pensamiento analítico, gestión de proyectos" : "Leadership, communication, analytical thinking, project management",
      certifications: [
        { id: "certification-sample", name: "Google Analytics Certification", date: "2025" },
      ],
    },
  };
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("es");
  const [template, setTemplate] = useState<TemplateId>("classic");
  const [activeSection, setActiveSection] = useState<SectionKey>("personal");
  const [resume, setResume] = useState<ResumeData>(createBlankResume);
  const [noExperience, setNoExperience] = useState(false);
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
  const photoInput = useRef<HTMLInputElement>(null);
  const copy = dictionary[language];
  const activeIndex = sections.indexOf(activeSection);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("alineacv-resume-v1");
        if (stored) {
          const parsed = JSON.parse(stored) as {
            resume?: ResumeData;
            language?: Language;
            template?: TemplateId;
            noExperience?: boolean;
          };
          if (parsed.resume) setResume(parsed.resume);
          if (parsed.language) setLanguage(parsed.language);
          if (parsed.template) setTemplate(parsed.template);
          if (typeof parsed.noExperience === "boolean") setNoExperience(parsed.noExperience);
        }
      } catch {
        window.localStorage.removeItem("alineacv-resume-v1");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        "alineacv-resume-v1",
        JSON.stringify({ resume, language, template, noExperience }),
      );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [hydrated, language, noExperience, resume, template]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const templateName = useMemo(() => {
    if (template === "photo-center") return copy.photoCenter;
    if (template === "photo-side") return copy.photoSide;
    return copy.classic;
  }, [copy, template]);

  function updatePersonal(field: keyof Personal, value: string) {
    setResume((current) => ({
      ...current,
      personal: { ...current.personal, [field]: value },
    }));
  }

  function updateEducation(id: string, field: keyof Omit<Education, "id">, value: string) {
    setResume((current) => ({
      ...current,
      education: current.education.map((item) => item.id === id ? { ...item, [field]: value } : item),
    }));
  }

  function updateExperience(id: string, field: keyof Omit<Experience, "id">, value: string) {
    setResume((current) => ({
      ...current,
      experience: current.experience.map((item) => item.id === id ? { ...item, [field]: value } : item),
    }));
  }

  function updateSkills(field: keyof Omit<Skills, "certifications">, value: string) {
    setResume((current) => ({ ...current, skills: { ...current.skills, [field]: value } }));
  }

  function updateCertification(id: string, field: "name" | "date", value: string) {
    setResume((current) => ({
      ...current,
      skills: {
        ...current.skills,
        certifications: current.skills.certifications.map((item) => item.id === id ? { ...item, [field]: value } : item),
      },
    }));
  }

  function addEducation() {
    setResume((current) => ({
      ...current,
      education: [
        ...current.education,
        { id: `education-${Date.now()}`, institution: "", degree: "", location: "", startDate: "", endDate: "", description: "" },
      ],
    }));
  }

  function addExperience() {
    setResume((current) => ({
      ...current,
      experience: [
        ...current.experience,
        { id: `experience-${Date.now()}`, company: "", position: "", location: "", startDate: "", endDate: "", responsibilities: "" },
      ],
    }));
  }

  function addCertification() {
    setResume((current) => ({
      ...current,
      skills: {
        ...current.skills,
        certifications: [...current.skills.certifications, { id: `certification-${Date.now()}`, name: "", date: "" }],
      },
    }));
  }

  function removeEducation(id: string) {
    setResume((current) => ({ ...current, education: current.education.filter((item) => item.id !== id) }));
  }

  function removeExperience(id: string) {
    setResume((current) => ({ ...current, experience: current.experience.filter((item) => item.id !== id) }));
  }

  function removeCertification(id: string) {
    setResume((current) => ({
      ...current,
      skills: { ...current.skills, certifications: current.skills.certifications.filter((item) => item.id !== id) },
    }));
  }

  function moveSection(direction: -1 | 1) {
    const nextIndex = Math.min(Math.max(activeIndex + direction, 0), sections.length - 1);
    setActiveSection(sections[nextIndex]);
    if (direction === 1 && activeIndex === sections.length - 1) setMobileView("preview");
  }

  function handlePhoto(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setNotice(copy.photoTooLarge);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updatePersonal("photo", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function saveNow() {
    window.localStorage.setItem(
      "alineacv-resume-v1",
      JSON.stringify({ resume, language, template, noExperience }),
    );
    setNotice(copy.manualSaved);
  }

  function loadExample() {
    setResume(createSampleResume(language));
    setNoExperience(false);
    setNotice(copy.sampleLoaded);
  }

  function exportPdf() {
    if (!resume.personal.fullName.trim()) {
      setActiveSection("personal");
      setMobileView("editor");
      setNotice(copy.printMissingName);
      return;
    }
    window.print();
  }

  const templateChoices: Array<{ id: TemplateId; title: string; description: string }> = [
    { id: "classic", title: copy.classic, description: copy.classicDescription },
    { id: "photo-center", title: copy.photoCenter, description: copy.photoCenterDescription },
    { id: "photo-side", title: copy.photoSide, description: copy.photoSideDescription },
  ];

  return (
    <main className="app-shell" id="top">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="AlineaCV — Inicio">
          <span className="brand-mark">A</span>
          <span>Alinea<span>CV</span></span>
        </a>
        <div className="header-actions">
          <nav className="header-nav" aria-label={language === "es" ? "Herramientas" : "Tools"}>
            <a className="active" href="/">{copy.builderNav}</a>
            <a href="/analizar-cv">{copy.analyzerNav}</a>
          </nav>
          <span className="privacy-note"><span>✓</span>{copy.privacy}</span>
          <div className="language-switcher" aria-label="Idioma / Language">
            <button type="button" className={language === "es" ? "active" : ""} onClick={() => setLanguage("es")} aria-pressed={language === "es"}>ES</button>
            <button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} aria-pressed={language === "en"}>EN</button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div>
          <p>{copy.eyebrow}</p>
          <h1>{copy.heroTitle}</h1>
          <span>{copy.heroBody}</span>
        </div>
        <div className="hero-badges" aria-label="Características">
          <span>ATS friendly</span>
          <span>3 Harvard templates</span>
          <span>PDF A4</span>
        </div>
      </section>

      <div className="mobile-view-toggle" aria-label="Cambiar vista">
        <button type="button" className={mobileView === "editor" ? "active" : ""} onClick={() => setMobileView("editor")}>{copy.edit}</button>
        <button type="button" className={mobileView === "preview" ? "active" : ""} onClick={() => setMobileView("preview")}>{copy.view}</button>
      </div>

      <section className={`workspace mobile-${mobileView}`} aria-label="Editor de currículum">
        <aside className="editor-panel">
          <div className="panel-heading">
            <div>
              <small>{copy.step} {activeIndex + 1} {copy.of} {sections.length}</small>
              <h2>{copy.editorTitle}</h2>
            </div>
            <div className="editor-actions">
              <button type="button" className="quiet-button" onClick={loadExample}>{copy.example}</button>
              <button type="button" className="quiet-button save-button" onClick={saveNow}>{copy.save}</button>
              <button type="button" className="primary-button" onClick={exportPdf}>{copy.export}</button>
            </div>
          </div>

          <div className="save-row">
            <span className="status-dot" />
            {copy.saved}
          </div>

          <div className="template-block">
            <div className="section-label-row">
              <div>
                <h3>{copy.template}</h3>
                <p>{copy.templateHint}</p>
              </div>
              <span>{copy.free}</span>
            </div>
            <div className="template-grid">
              {templateChoices.map((choice) => (
                <button
                  type="button"
                  key={choice.id}
                  className={`template-card ${template === choice.id ? "active" : ""}`}
                  onClick={() => setTemplate(choice.id)}
                  aria-pressed={template === choice.id}
                >
                  <span className={`template-thumbnail ${choice.id}`} aria-hidden="true">
                    {choice.id !== "classic" && <i />}
                    <b />
                    <em />
                    <em />
                  </span>
                  <strong>{choice.title}</strong>
                  <small>{choice.description}</small>
                  <span className="template-check">✓</span>
                </button>
              ))}
            </div>
          </div>

          <div className="progress-track" aria-hidden="true"><span style={{ width: `${((activeIndex + 1) / sections.length) * 100}%` }} /></div>

          <nav className="form-tabs" aria-label="Secciones del currículum">
            {sections.map((section) => (
              <button
                type="button"
                key={section}
                className={activeSection === section ? "active" : ""}
                onClick={() => setActiveSection(section)}
              >
                {copy[section]}
              </button>
            ))}
          </nav>

          <div className="form-content">
            {activeSection === "personal" && (
              <div className="section-form">
                <div className="photo-control">
                  <div className="photo-preview">
                    {resume.personal.photo ? <img src={resume.personal.photo} alt={copy.photoAlt} /> : <span>{initials(resume.personal.fullName)}</span>}
                  </div>
                  <div>
                    <strong>{copy.photo}</strong>
                    <p>{copy.photoHelp}</p>
                    <div className="inline-actions">
                      <button type="button" className="outline-button" onClick={() => photoInput.current?.click()}>＋ {copy.uploadPhoto}</button>
                      {resume.personal.photo && <button type="button" className="text-button" onClick={() => updatePersonal("photo", "")}>{copy.removePhoto}</button>}
                    </div>
                    <input
                      className="visually-hidden"
                      ref={photoInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => handlePhoto(event.target.files?.[0])}
                    />
                  </div>
                </div>
                <div className="form-grid">
                  <TextField label={copy.fullName} value={resume.personal.fullName} onChange={(value) => updatePersonal("fullName", value)} placeholder={language === "es" ? "Ej. Camila Torres" : "e.g. Jordan Miller"} />
                  <TextField label={copy.professionalRole} value={resume.personal.role} onChange={(value) => updatePersonal("role", value)} placeholder={language === "es" ? "Ej. Analista de Datos" : "e.g. Data Analyst"} />
                  <TextField type="email" label={copy.email} value={resume.personal.email} onChange={(value) => updatePersonal("email", value)} placeholder="nombre@email.com" />
                  <TextField label={copy.phone} value={resume.personal.phone} onChange={(value) => updatePersonal("phone", value)} placeholder="+51 999 999 999" />
                  <TextField label={copy.location} value={resume.personal.location} onChange={(value) => updatePersonal("location", value)} placeholder={language === "es" ? "Lima, Perú" : "Boston, MA"} />
                  <TextField label={copy.linkedin} value={resume.personal.linkedin} onChange={(value) => updatePersonal("linkedin", value)} placeholder="linkedin.com/in/usuario" />
                  <TextField wide label={copy.website} value={resume.personal.website} onChange={(value) => updatePersonal("website", value)} placeholder="portafolio.com" />
                  <TextareaField wide label={copy.summary} help={copy.summaryHelp} value={resume.personal.summary} onChange={(value) => updatePersonal("summary", value)} rows={5} />
                </div>
              </div>
            )}

            {activeSection === "education" && (
              <div className="section-form entries-list">
                {resume.education.map((item, index) => (
                  <div className="entry-card" key={item.id}>
                    <div className="entry-heading">
                      <h3>{copy.educationEntry} #{index + 1}</h3>
                      <button type="button" onClick={() => removeEducation(item.id)} disabled={resume.education.length === 1} aria-label={`${copy.delete} ${copy.educationEntry} ${index + 1}`}>×</button>
                    </div>
                    <div className="form-grid">
                      <TextField label={copy.institution} value={item.institution} onChange={(value) => updateEducation(item.id, "institution", value)} />
                      <TextField label={copy.degree} value={item.degree} onChange={(value) => updateEducation(item.id, "degree", value)} />
                      <TextField label={copy.location} value={item.location} onChange={(value) => updateEducation(item.id, "location", value)} />
                      <TextField label={copy.startDate} value={item.startDate} onChange={(value) => updateEducation(item.id, "startDate", value)} placeholder="Sep 2020" />
                      <TextField label={copy.endDate} value={item.endDate} onChange={(value) => updateEducation(item.id, "endDate", value)} placeholder={copy.present} />
                      <TextareaField wide label={copy.educationDescription} value={item.description} onChange={(value) => updateEducation(item.id, "description", value)} rows={4} />
                    </div>
                  </div>
                ))}
                <button type="button" className="add-button" onClick={addEducation}>＋ {copy.addEducation}</button>
              </div>
            )}

            {activeSection === "experience" && (
              <div className="section-form entries-list">
                <label className="toggle-row">
                  <span>{copy.noExperience}</span>
                  <input type="checkbox" checked={noExperience} onChange={(event) => setNoExperience(event.target.checked)} />
                  <i aria-hidden="true" />
                </label>
                {!noExperience && resume.experience.map((item, index) => (
                  <div className="entry-card" key={item.id}>
                    <div className="entry-heading">
                      <h3>{copy.experienceEntry} #{index + 1}</h3>
                      <button type="button" onClick={() => removeExperience(item.id)} disabled={resume.experience.length === 1} aria-label={`${copy.delete} ${copy.experienceEntry} ${index + 1}`}>×</button>
                    </div>
                    <div className="form-grid">
                      <TextField label={copy.company} value={item.company} onChange={(value) => updateExperience(item.id, "company", value)} />
                      <TextField label={copy.position} value={item.position} onChange={(value) => updateExperience(item.id, "position", value)} />
                      <TextField label={copy.location} value={item.location} onChange={(value) => updateExperience(item.id, "location", value)} />
                      <TextField label={copy.startDate} value={item.startDate} onChange={(value) => updateExperience(item.id, "startDate", value)} placeholder="Mar 2022" />
                      <TextField label={copy.endDate} value={item.endDate} onChange={(value) => updateExperience(item.id, "endDate", value)} placeholder={copy.present} />
                      <TextareaField wide label={copy.responsibilities} help={copy.responsibilitiesHelp} value={item.responsibilities} onChange={(value) => updateExperience(item.id, "responsibilities", value)} rows={7} />
                    </div>
                  </div>
                ))}
                {!noExperience && <button type="button" className="add-button" onClick={addExperience}>＋ {copy.addExperience}</button>}
              </div>
            )}

            {activeSection === "skills" && (
              <div className="section-form">
                <div className="form-grid">
                  <TextareaField wide label={copy.technicalSkills} help={copy.technicalHelp} value={resume.skills.technical} onChange={(value) => updateSkills("technical", value)} rows={4} />
                  <TextField wide label={copy.languages} value={resume.skills.languages} onChange={(value) => updateSkills("languages", value)} placeholder={language === "es" ? "Español (nativo), Inglés (avanzado)" : "English (native), Spanish (advanced)"} />
                </div>
                <div className="subsection-heading"><h3>{copy.certifications}</h3></div>
                <div className="certification-list">
                  {resume.skills.certifications.map((item) => (
                    <div className="certification-row" key={item.id}>
                      <TextField label={copy.certificationName} value={item.name} onChange={(value) => updateCertification(item.id, "name", value)} />
                      <TextField label={copy.certificationDate} value={item.date} onChange={(value) => updateCertification(item.id, "date", value)} />
                      <button type="button" onClick={() => removeCertification(item.id)} disabled={resume.skills.certifications.length === 1} aria-label={`${copy.delete} ${copy.certifications}`}>×</button>
                    </div>
                  ))}
                  <button type="button" className="outline-button" onClick={addCertification}>＋ {copy.addCertification}</button>
                </div>
                <div className="form-grid last-grid">
                  <TextareaField wide label={copy.additionalSkills} value={resume.skills.additional} onChange={(value) => updateSkills("additional", value)} rows={4} />
                </div>
              </div>
            )}
          </div>

          <div className="form-navigation">
            <button type="button" className="outline-button" onClick={() => moveSection(-1)} disabled={activeIndex === 0}>{copy.previous}</button>
            <button type="button" className="next-button" onClick={() => moveSection(1)}>{activeIndex === sections.length - 1 ? copy.finish : copy.next} <span>→</span></button>
          </div>
        </aside>

        <section className="preview-panel">
          <div className="preview-heading">
            <div>
              <small>{copy.preview}</small>
              <h2>{templateName}</h2>
            </div>
          </div>
          <ResumePreview resume={resume} template={template} copy={copy} noExperience={noExperience} />
        </section>
      </section>

      {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
    </main>
  );
}

function TextField({ label, value, onChange, placeholder = "", type = "text", wide = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  wide?: boolean;
}) {
  return (
    <label className={`form-field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function TextareaField({ label, value, onChange, help, rows = 4, wide = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  rows?: number;
  wide?: boolean;
}) {
  return (
    <label className={`form-field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} />
      {help && <small>{help}</small>}
    </label>
  );
}

function ResumePreview({ resume, template, copy, noExperience }: {
  resume: ResumeData;
  template: TemplateId;
  copy: Copy;
  noExperience: boolean;
}) {
  const person = resume.personal;
  const name = person.fullName || copy.previewName;
  const role = person.role || copy.previewRole;
  const contact = [person.location, person.phone, person.email, person.linkedin, person.website].filter(Boolean);
  const validEducation = resume.education.filter((item) => item.institution || item.degree || item.description);
  const validExperience = noExperience ? [] : resume.experience.filter((item) => item.company || item.position || item.responsibilities);
  const validCertifications = resume.skills.certifications.filter((item) => item.name || item.date);
  const experienceFirst = validExperience.length > 0;
  const educationSection = <ResumeSection key="education" title={copy.educationSection}><EducationItems items={validEducation} empty={copy.emptyEntry} /></ResumeSection>;
  const experienceSection = noExperience
    ? null
    : <ResumeSection key="experience" title={copy.experienceSection}><ExperienceItems items={validExperience} empty={copy.emptyEntry} /></ResumeSection>;
  const orderedCareerSections = experienceFirst
    ? [experienceSection, educationSection]
    : [educationSection, experienceSection];

  if (template === "photo-side") {
    return (
      <article className="resume-sheet template-photo-side" aria-label={copy.preview}>
        <aside className="resume-sidebar">
          <ResumePhoto person={person} copy={copy} />
          <h2>{name}</h2>
          <p className="side-role">{role}</p>
          <ResumeSection title={copy.contactSection} compact>
            <ul className="contact-list">{contact.map((item) => <li key={item}>{item}</li>)}</ul>
          </ResumeSection>
          {resume.skills.technical && <ResumeSection title={copy.technicalSkills} compact><p>{resume.skills.technical}</p></ResumeSection>}
          {resume.skills.languages && <ResumeSection title={copy.languagesSection} compact><p>{resume.skills.languages}</p></ResumeSection>}
        </aside>
        <div className="resume-main">
          <ResumeSection title={copy.profileSection}>
            <p>{person.summary || copy.emptyProfile}</p>
          </ResumeSection>
          {orderedCareerSections}
          {validCertifications.length > 0 && <ResumeSection title={copy.certificationsSection}><CertificationItems items={validCertifications} /></ResumeSection>}
          {resume.skills.additional && <ResumeSection title={copy.skillsSection}><p>{resume.skills.additional}</p></ResumeSection>}
        </div>
      </article>
    );
  }

  return (
    <article className={`resume-sheet ${template === "photo-center" ? "template-photo-center" : "template-classic"}`} aria-label={copy.preview}>
      <header className="resume-header">
        {template === "photo-center" && <ResumePhoto person={person} copy={copy} />}
        <p>{role}</p>
        <h2>{name}</h2>
        {contact.length > 0 && <span>{contact.join(" · ")}</span>}
      </header>
      <div className="resume-body">
        <ResumeSection title={copy.profileSection}>
          <p>{person.summary || copy.emptyProfile}</p>
        </ResumeSection>
        {orderedCareerSections}
        {(resume.skills.technical || resume.skills.languages || resume.skills.additional) && (
          <ResumeSection title={copy.skillsSection}>
            <div className="skills-preview">
              {resume.skills.technical && <p><strong>{copy.technicalSkills}:</strong> {resume.skills.technical}</p>}
              {resume.skills.languages && <p><strong>{copy.languagesSection}:</strong> {resume.skills.languages}</p>}
              {resume.skills.additional && <p>{resume.skills.additional}</p>}
            </div>
          </ResumeSection>
        )}
        {validCertifications.length > 0 && <ResumeSection title={copy.certificationsSection}><CertificationItems items={validCertifications} /></ResumeSection>}
      </div>
    </article>
  );
}

function ResumePhoto({ person, copy }: { person: Personal; copy: Copy }) {
  return (
    <div className="resume-photo">
      {person.photo ? <img src={person.photo} alt={copy.photoAlt} /> : <span>{initials(person.fullName)}</span>}
    </div>
  );
}

function ResumeSection({ title, children, compact = false }: { title: string; children: ReactNode; compact?: boolean }) {
  return (
    <section className={`resume-section ${compact ? "compact" : ""}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function ExperienceItems({ items, empty }: { items: Experience[]; empty: string }) {
  if (items.length === 0) return <p className="resume-empty">{empty}</p>;
  return (
    <div className="resume-items">
      {items.map((item) => (
        <div className="resume-item" key={item.id}>
          <div className="resume-item-heading">
            <div><strong>{item.position || item.company}</strong><span>{item.position && item.company ? item.company : ""}{item.location ? ` · ${item.location}` : ""}</span></div>
            <time>{dateRange(item.startDate, item.endDate)}</time>
          </div>
          {item.responsibilities && <BulletText text={item.responsibilities} />}
        </div>
      ))}
    </div>
  );
}

function EducationItems({ items, empty }: { items: Education[]; empty: string }) {
  if (items.length === 0) return <p className="resume-empty">{empty}</p>;
  return (
    <div className="resume-items">
      {items.map((item) => (
        <div className="resume-item" key={item.id}>
          <div className="resume-item-heading">
            <div><strong>{item.degree || item.institution}</strong><span>{item.degree && item.institution ? item.institution : ""}{item.location ? ` · ${item.location}` : ""}</span></div>
            <time>{dateRange(item.startDate, item.endDate)}</time>
          </div>
          {item.description && <p>{item.description}</p>}
        </div>
      ))}
    </div>
  );
}

function CertificationItems({ items }: { items: Certification[] }) {
  return (
    <ul className="certification-preview">
      {items.map((item) => <li key={item.id}><span>{item.name}</span><time>{item.date}</time></li>)}
    </ul>
  );
}

function BulletText({ text }: { text: string }) {
  const lines = text.split(/\n+/).map((item) => item.replace(/^[•·\-–—]\s*/, "").trim()).filter(Boolean);
  return <ul>{lines.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>;
}

function initials(name: string) {
  const result = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return result || "AC";
}

function dateRange(start: string, end: string) {
  if (start && end) return `${start} — ${end}`;
  return start || end;
}
