import test from 'node:test';
import assert from 'node:assert/strict';
import { employmentDuration } from '../app/analizar-cv/employment-duration.mjs';
import { analyzeResume } from '../app/analizar-cv/analysis.mjs';
import { buildAtsResume, buildAdaptedResume, missingEvidenceQuestions } from '../app/analizar-cv/adapted-resume.mjs';
const cv=`Ana Torres
Ingeniera geóloga
ana@example.com
Licencia de conducir A 2B
PERFIL PROFESIONAL
Ingeniera con tres años de experiencia en conducción.
EXPERIENCIA LABORAL
Empresa Uno Junio 2021 – Actualidad
Hidrogeóloga
• Supervisar perforaciones hidrogeológicas.
Empresa Dos Agosto 2020 – septiembre 2020
Asistente de geología
• Realizar levantamientos topográficos.
FORMACIÓN ACADÉMICA
Universidad del Sur 2014 - 2018
Ingeniería Geológica
HABILIDADES TÉCNICAS
Leapfrog: intermedio
HABILIDADES BLANDAS
• Liderazgo y coordinación de equipos.
• Comunicación efectiva y asertividad.
• Resolución de problemas técnicos.`;
const job='Experiencia mínima de 4 años en hidrogeología aplicada a minería. Licencia de conducir A1 con experiencia de manejo en mina mínimo 03 años.';
test('calculates dated employment through the present and does not count study dates',()=>{
 const duration=employmentDuration(cv,new Date('2026-10-21T12:00:00Z'));
 assert.equal(duration.months,65);assert.equal(duration.years,5);
});
test('does not double count concurrent employment or count gaps',()=>{
 const text='EXPERIENCIA\nEmpresa Uno 01/2018 - 01/2020\nEmpresa Dos 01/2019 - 01/2021\nEmpresa Tres 01/2023 - 01/2024\nEDUCACIÓN\nUniversidad 01/2000 - 01/2010';
 assert.equal(employmentDuration(text,new Date('2026-10-21')).months,48);
});
test('does not confuse three years of driving with total professional experience',()=>{
 const result=analyzeResume(cv,job);
 const years=result.eligibilityChecks.find(c=>c.id==='eligibility-experience');
 assert.notEqual(years.status,'missing');assert.match(years.evidence,/fechas laborales/);assert.doesNotMatch(years.evidence,/declara 3 años/);
 assert.equal(result.eligibilityChecks.find(c=>c.id==='eligibility-driving').label,'Licencia de conducir A1');
});
test('preserves soft skills visibly as a separate section in both exports',()=>{
 for(const document of [buildAtsResume(cv),buildAdaptedResume(cv,analyzeResume(cv,job),'Ingeniero')]){
 const soft=document.sections.find(s=>s.kind==='softSkills');assert.equal(soft.heading,'INTERPERSONALES');
 for(const text of ['Liderazgo y coordinación de equipos.','Comunicación efectiva y asertividad.','Resolución de problemas técnicos.']) assert.ok(soft.blocks.some(b=>b.text===text || b.bullets?.includes(text)));
 assert.match(document.plainText,/tres años de experiencia en conducción/);
 }
});
test('prepares editable drafts for gaps without requiring the operator to write them',()=>{
 const result=analyzeResume(cv,'Se requiere ArcGIS y MODFLOW.');
 const questions=missingEvidenceQuestions(result,cv);
 assert.deepEqual(new Set(questions.flatMap(q=>q.coveredKeywords)),new Set(["ArcGIS","MODFLOW"]));assert.ok(questions.every(q=>q.draftText.length>15 && q.roleIndex!==''));
});
test('adds selected personal requirement proposals without replacing the source or affecting ATS-only export',()=>{
 const result=analyzeResume(cv,job);
 const added='Experiencia profesional acumulada de 5 años en hidrogeología.';
 const document=buildAdaptedResume(cv,result,'Ingeniera','es',{confirmedEligibility:[{id:'eligibility-experience',text:added,confirmed:true}]});
 assert.ok(document.plainText.includes(added));assert.ok(document.plainText.includes('Licencia de conducir A 2B'));
 assert.ok(!buildAtsResume(cv).plainText.includes(added));
});

test('estimates elapsed years when employment dates omit the month',()=>{
 const duration=employmentDuration('EXPERIENCIA\nEmpresa Uno 2018 - 2020',new Date('2026-10-21'));
 assert.equal(duration.months,24);assert.equal(duration.approximate,true);
});

test('keeps tools, technical competencies, soft skills and courses organized independently',()=>{
 const text=cv+`\nSoftware y herramientas\n• Leapfrog: nivel intermedio. • HGA\n• Inglés: nivel básico.\nCompetencias Técnicas\n• Pit Dewatering y desaguado de tajos mineros.\n• Instalación de piezómetros y pozos.\nFormación Profesional Complementaria\nInstituto Uno\n• Hidrogeología aplicada | 2024\n• Modelamiento hidrogeológico | 2023\nInstituto Dos\n• Pruebas de bombeo | 2022`;
 const document=buildAtsResume(text);
 assert.equal(document.skillGroupHeading,"HABILIDADES");
 const tools=document.sections.find(s=>s.kind==='tools');
 assert.ok(tools.blocks.some(b=>b.label==='Leapfrog' && b.value==='nivel intermedio.'));
 assert.ok(tools.blocks.some(b=>b.text==='HGA'));
 assert.ok(!tools.blocks.some(b=>b.label==='Competencias'));
 assert.ok(document.sections.find(s=>s.kind==='technicalSkills').blocks[0].bullets.includes('Instalación de piezómetros y pozos.'));
 assert.ok(document.sections.find(s=>s.kind==='softSkills').blocks[0].bullets.includes('Liderazgo y coordinación de equipos.'));
 assert.ok(document.sections.find(s=>s.kind==='languages').blocks.some(b=>b.label==='Inglés' && b.value==='nivel básico.'));
 const courses=document.sections.find(s=>s.kind==='certifications').blocks;
 assert.deepEqual(courses.map(c=>[c.title,c.meta[0],c.date]),[
 ['Hidrogeología aplicada','Instituto Uno','2024'],['Modelamiento hidrogeológico','Instituto Uno','2023'],['Pruebas de bombeo','Instituto Dos','2022']]);
});
