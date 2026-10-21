import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { extractPdfPageText, extractPdfOperatorItems } from '../app/analizar-cv/pdf-text-extraction.mjs';
import { buildAtsResume, buildAdaptedResume, missingEvidenceQuestions, confirmResumeEvidence } from '../app/analizar-cv/adapted-resume.mjs';
import { analyzeResume } from '../app/analizar-cv/analysis.mjs';

const source = `ANA TORRES RAMOS
Ingeniera Geóloga | Hidrogeología minera
Arequipa, Perú · ana@example.com · CIP: 123456
Teléfono: (+51) 999 888 777
Licencia de conducir A2B
Ingeniera geóloga colegiada y habilitada, con experiencia en hidrogeología minera. He supervisado perforaciones y piezómetros. Cuento con tres años de experiencia en conducción. Manejo FEFLOW y MODFLOW.
Educación
• Ingeniería Geológica 2014 - 2018
Universidad del Sur
Experiencia Laboral
Consultora Uno Junio 2021 – Actualidad
Hidrogeóloga | Mina Uno
• Supervisar perforaciones hidrogeológicas y geotécnicas para instalar pozos y sistemas de
drenaje.
• Procesar pruebas hidráulicas con FEFLOW.
Logros
• Lideré dos frentes de desaguado.
Empresa Dos
Asistente de geología | Mina Dos
Agosto 2020 – septiembre 2020
• Ejecutar levantamientos topográficos.
• Verificar registros de campo.
Mina Tres Enero 2018 – abril 2018
Practicante de geología
• Validar datos geológicos.
Formación Profesional Complementaria
DHI
• Modelamiento hidrogeológico en minería | 2026
Instituto Uno
• Hidrogeología aplicada | 2024
Software y herramientas
• Leapfrog: nivel intermedio. • SEEP/W: nivel básico.
• Microsoft Office: nivel intermedio.
Competencias Técnicas
• Gestión de SSEE, seguridad minera y estándares ambientales.
Habilidades Blandas
• Liderazgo y coordinación de equipos.`;
const vacancy = `Puesto: Ingeniero de Implementación Hidrogeológica
Hidrogeología aplicada a minería. Campañas de perforación. Pit Dewatering. Pruebas hidráulicas. Perforación hidrogeológica y geotécnica. Instrumentación hidrogeológica. Monitoreo hidrogeológico. Drenaje y bombeo. Modelamiento hidrogeológico. Balances hídricos. Gestión de SSEE. Microsoft office: Intermedio. ArcGIS, Autodesk Civil 3D: Básico. Feflow y Modflow: Básico. Leafrog: Básico. Slide2 y Seep/W: Básico. HGA. Inglés básico. Licencia de conducir A1.`;

test('does not treat a word inside a paragraph as a heading or detach right-aligned dates', () => {
  const item = (str, x, y, width) => ({ str, transform: [10, 0, 0, 10, x, y], width });
  const text = extractPdfPageText([
    item('Ana Torres', 30, 800, 100),
    item('Ingeniera con', 30, 760, 160), item('experiencia', 270, 760, 60), item('en hidrogeología minera.', 340, 760, 180),
    item('Educación', 30, 720, 70), item('Ingeniería Geológica', 30, 700, 160), item('2014 - 2018', 470, 700, 70),
    item('Experiencia Laboral', 30, 650, 120), item('Consultora Uno', 30, 630, 100), item('Junio 2021 – Actualidad', 420, 630, 150),
  ]);
  assert.match(text, /Ingeniera con experiencia en hidrogeología minera\./);
  assert.match(text, /Ingeniería Geológica 2014 - 2018/);
  assert.match(text, /Consultora Uno Junio 2021 – Actualidad/);
});

test('preserves employers, roles, exact original bullet wording, months, education and courses', () => {
  const baseline = buildAtsResume(source);
  const adapted = buildAdaptedResume(source, analyzeResume(source, vacancy), 'Ingeniero de Implementación Hidrogeológica');
  for (const document of [baseline, adapted]) {
    const jobs = document.sections.find(s => s.kind === 'experience').blocks;
    assert.equal(jobs.length, 3);
    assert.deepEqual(jobs.map(j => j.title), ['Consultora Uno', 'Empresa Dos', 'Mina Tres']);
    assert.deepEqual(jobs.map(j => j.date), ['06/2021 - Actualidad', '08/2020 - 09/2020', '01/2018 - 04/2018']);
    assert.ok(jobs[0].bullets.includes('Supervisar perforaciones hidrogeológicas y geotécnicas para instalar pozos y sistemas de drenaje.'));
    assert.ok(jobs[0].bullets.some(b => b.includes('Lideré dos frentes de desaguado.')));
    assert.ok(!jobs[0].bullets.some(b => b.includes('Empresa Dos')));
    const education = document.sections.find(s => s.kind === 'education');
    assert.deepEqual(education.blocks[0], { type: 'entry', title: 'Ingeniería Geológica', date: '2014 - 2018', meta: ['Universidad del Sur'], bullets: [] });
    assert.ok(document.sections.some(s => s.kind === 'certifications'));
    assert.ok(document.sections.find(s => s.kind === "certifications").blocks.some(block => block.title === "Hidrogeología aplicada" && block.meta.includes("Instituto Uno")));
    for (const value of ['CIP: 123456', 'Arequipa, Perú', 'Licencia de conducir A2B', 'tres años de experiencia en conducción', 'He supervisado perforaciones y piezómetros.', 'FEFLOW y MODFLOW', 'Liderazgo y coordinación']) assert.ok(document.plainText.includes(value), value);
    assert.doesNotMatch(document.plainText, /HGA|ArcGIS|Slide2/);
  }
});

test('requires operator confirmation, an actual job and editable evidence before adding a missing requirement', () => {
  const result = analyzeResume(source, vacancy);
  const question = missingEvidenceQuestions(result, source).find(q => q.coveredKeywords.includes('ArcGIS'));
  assert.ok(question);
  for (const answer of [{}, { confirmed: true, roleIndex: '', text: 'Supervisó mapas con ArcGIS.' }, { confirmed: true, roleIndex: '99', text: 'Supervisó mapas con ArcGIS.' }, { confirmed: true, roleIndex: '0', text: '' }]) assert.equal(confirmResumeEvidence(question, answer), null);
  const confirmed = confirmResumeEvidence(question, { confirmed: true, roleIndex: '1', text: 'Preparó mapas de monitoreo con ArcGIS.' });
  const document = buildAdaptedResume(source, result, 'Ingeniero', 'es', { confirmedExperienceSuggestions: [confirmed] });
  const jobs = document.sections.find(s => s.kind === 'experience').blocks;
  assert.ok(jobs[1].bullets.some(b => b.includes('Preparó mapas de monitoreo con ArcGIS.')));
  assert.ok(!jobs[0].bullets.some(b => b.includes('ArcGIS')));
  assert.doesNotMatch(document.plainText, /HGA|Slide2/);
  assert.doesNotMatch(buildAtsResume(source).plainText, /ArcGIS/);
});

test('understands mining requirements and keeps driving eligibility outside project suggestions', () => {
  const result = analyzeResume(source, vacancy);
  const keywords = [...result.keywordMatch.matched, ...result.keywordMatch.missing];
  for (const value of ['Hidrogeología minera', 'Pit Dewatering', 'Pruebas hidráulicas', 'FEFLOW', 'MODFLOW', 'ArcGIS', 'Leapfrog', 'SEEP/W']) assert.ok(keywords.includes(value), value);
  assert.ok(!keywords.includes('A1'));
  assert.ok(!keywords.includes('Campañas'));
  assert.ok(result.eligibilityChecks.some(c => c.id === 'eligibility-driving' && c.status === 'review'));
  assert.ok(!missingEvidenceQuestions(result, source).some(q => q.keyword === 'A1'));
});

test('preserves the supplied PDF through its actual PDF.js extraction path', { skip: !process.env.ALINEACV_TEST_PDF }, async () => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({ data: new Uint8Array(await readFile(process.env.ALINEACV_TEST_PDF)) });
  try {
    const pdf = await task.promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i), viewport = page.getViewport({ scale: 1 });
      pages.push(extractPdfPageText((await page.getTextContent()).items, viewport.width, extractPdfOperatorItems(await page.getOperatorList(), pdfjs.OPS, viewport.width, viewport.height)));
    }
    const text = pages.join('\n\n');
    const document = buildAdaptedResume(text, analyzeResume(text, vacancy), 'Ingeniero de Implementación Hidrogeológica');
    const baseline = buildAtsResume(text);
    assert.equal(document.sections.find(s => s.kind === 'experience').blocks.length, 3);
    assert.equal(document.sections.find(s => s.kind === 'education').blocks[0].meta.length, 1);
    assert.ok(document.sections.find(s => s.kind === 'certifications').blocks.length >= 9);
    // Every source bullet must survive, including continuation lines and two-column tools.
    const normalized = value => value.replace(/\s+/g, ' ').trim();
    const repaired = (await import('../app/analizar-cv/resume-improvements.mjs')).repairWrappedResumeLines(text);
    for (const line of repaired.split('\n').filter(line => line.startsWith('•'))) {
      if (line.includes('2014 - 2018')) continue; // Date is structured separately in education.
      for (const segment of line.split('•').map(normalized).filter(Boolean)) {
        const withoutDate = segment.replace(/\s*\|?\s*(?:19|20)\d{2}(?:\s*[-–—]\s*(?:19|20)\d{2})?$/, '').trim();
        const comparable = value => normalized(value).replace(/:\s+/g, ': ');
        assert.ok(comparable(document.plainText).includes(comparable(withoutDate)), 'Lost source bullet: ' + segment);
        assert.ok(comparable(baseline.plainText).includes(comparable(withoutDate)), 'Lost baseline bullet: ' + segment);
      }
    }
  } finally { await task.destroy(); }
});
