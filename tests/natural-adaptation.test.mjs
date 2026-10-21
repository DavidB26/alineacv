import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeResume } from '../app/analizar-cv/analysis.mjs';
import { buildAdaptedResume, buildAtsResume, missingEvidenceQuestions, confirmResumeEvidence } from '../app/analizar-cv/adapted-resume.mjs';

const designer=`Ruben Rivera
Diseñador gráfico publicitario / 3D
ruben@example.com
PERFIL PROFESIONAL
Diseñador con experiencia en publicidad y piezas visuales.
EXPERIENCIA LABORAL
LAGROUP
Diseñador gráfico publicitario / 3D
2012 - 2015
• Preparar piezas para impresión.
MAKE PUBLICIDAD
Diseñador gráfico senior
2020 - 2025
• Crear recursos visuales para campañas.
SOFTWARE
Adobe Photoshop
IDIOMAS
Inglés básico`;
function selectedQuestions(result,source){
 return missingEvidenceQuestions(result,source).map(q=>confirmResumeEvidence(q,{confirmed:true,roleIndex:q.roleIndex,text:q.draftText})).filter(Boolean);
}

test('integrates a language update in Idiomas without recruiter-facing workflow labels or a duplicate level',()=>{
 const document=buildAdaptedResume(designer,{},'Diseñador','es',{confirmedEligibility:[{id:'eligibility-english',confirmed:true,text:'Inglés INTERMEDIO'}]});
 const languages=document.sections.find(s=>s.kind==='languages');
 assert.equal(languages.blocks.length,1);assert.equal(languages.blocks[0].label,'Inglés');assert.equal(languages.blocks[0].value,'Intermedio');
 assert.doesNotMatch(document.plainText,/ADICIONES|CONFIRMAD|Inglés: básico/i);
 assert.ok(document.plainText.includes('Preparar piezas para impresión.'));
 assert.ok(document.plainText.includes('Crear recursos visuales para campañas.'));
 assert.match(buildAtsResume(designer).plainText,/Inglés: básico/);
});

test('groups branding and graphic design into one responsibility and expresses communication naturally',()=>{
 const result={keywordMatch:{matched:[],missing:['Branding','Diseño gráfico','Comunicación'],projectMissing:['Branding','Diseño gráfico','Comunicación']}};
 const questions=missingEvidenceQuestions(result,designer);
 assert.equal(questions.length,2);
 const proposals=selectedQuestions(result,designer);
 const document=buildAdaptedResume(designer,result,'Diseñador gráfico','es',{confirmedExperienceSuggestions:proposals});
 const added=proposals.flatMap(p=>p.bullets);
 assert.equal(added.length,2);assert.ok(added.some(b=>/branding e identidad visual/.test(b)));
 assert.ok(added.some(b=>/comunicación clara/.test(b)));
 for(const bullet of added){assert.doesNotMatch(bullet,/^(?:Branding|Diseño gráfico|Comunicación):|con Comunicación|con Diseño gráfico/);}
 assert.doesNotMatch(document.plainText,/Competencias confirmadas|ADICIONES PARA LA OFERTA/);
 assert.ok(document.plainText.includes('Preparar piezas para impresión.'));
 assert.ok(document.plainText.includes('Crear recursos visuales para campañas.'));
 assert.equal(proposals[0].roleDate,'2020 - 2025');
});

test('retains only the skills actually present in an edited grouped proposal',()=>{
 const question={id:'draft',keyword:'ArcGIS · MODFLOW',coveredKeywords:['ArcGIS','MODFLOW'],roles:[{title:'Geóloga',date:'2021 - Actualidad'}]};
 const selected=confirmResumeEvidence(question,{confirmed:true,roleIndex:'0',text:'Preparar mapas de monitoreo con ArcGIS.'});
 assert.deepEqual(selected.coveredKeywords,['ArcGIS']);assert.deepEqual(selected.bullets,['Preparar mapas de monitoreo con ArcGIS.']);
});

test('removes legacy keyword prefixes from additions while preserving original labelled content',()=>{
 const document=buildAdaptedResume(designer,{},'Diseñador','es',{confirmedExperienceSuggestions:[{included:true,roleTitle:'LAGROUP',roleDate:'2012 - 2015',coveredKeywords:['Branding'],bullets:['Branding: Desarrollar identidades visuales para campañas.']}]});
 assert.match(document.plainText,/• Desarrollar identidades visuales para campañas\./);assert.doesNotMatch(document.plainText,/Branding: Desarrollar/);
});

test('routes updated years and license details into the profile and contact instead of a separate additions section',()=>{
 const source=designer.replace('ruben@example.com','ruben@example.com\nLicencia de conducir A2B');
 const document=buildAdaptedResume(source,{},'Diseñador','es',{confirmedEligibility:[
 {id:'eligibility-experience',confirmed:true,text:'Experiencia profesional acumulada de 8 años, según los periodos laborales del CV.'},
 {id:'eligibility-driving',confirmed:true,text:'Licencia de conducir A2B. Experiencia de conducción en mina.'}]});
 assert.ok(document.contactLines.includes('Licencia de conducir A2B'));
 const profile=document.sections.find(s=>s.kind==='profile').blocks.map(b=>b.text).join(' ');
 assert.match(profile,/Experiencia profesional acumulada de 8 años\./);assert.match(profile,/Experiencia de conducción en mina\./);
 assert.doesNotMatch(document.plainText,/ADICIONES PARA LA OFERTA|según los periodos laborales/);
});

test('keeps the same integration contract across professional domains',()=>{
 for(const [headline,role,keyword] of [
 ['Desarrolladora frontend','Frontend Developer','TypeScript'],
 ['Abogada corporativa','Abogada','Debida diligencia'],
 ['Arquitecta','Arquitecta','Revit'],
 ['Analista financiera','Analista financiera','Presupuestos']]){
 const source=`Ana Torres\n${headline}\nana@example.com\nEXPERIENCIA PROFESIONAL\n${role} - Empresa Real 2021 - Actualidad\n• Coordinar entregables con el equipo.\nEDUCACIÓN\nUniversidad del Sur 2014 - 2018`;
 const result=analyzeResume(source,'Requisitos: '+keyword+'.');
 const selected=selectedQuestions(result,source);
 const document=buildAdaptedResume(source,result,headline,'es',{confirmedExperienceSuggestions:selected});
 assert.ok(selected.length>0,headline);assert.ok(document.plainText.includes('Coordinar entregables con el equipo.'));
 assert.ok(document.plainText.includes('Universidad del Sur'));assert.doesNotMatch(document.plainText,/ADICIONES PARA LA OFERTA|confirmadas/i);
 assert.ok(selected.every(p=>p.bullets.every(b=>!b.startsWith(keyword+':'))));
 }
});

test('updates the same language without duplication when the interface and source use different languages',()=>{
 const document=buildAdaptedResume(designer,{},'Graphic Designer','en',{confirmedEligibility:[{id:'eligibility-english',confirmed:true,text:'English INTERMEDIATE'}]});
 const languages=document.sections.find(s=>s.kind==='languages');
 assert.equal(languages.blocks.length,1);assert.equal(languages.blocks[0].label,'English');assert.equal(languages.blocks[0].value,'Intermediate');
 assert.doesNotMatch(document.plainText,/ADDITIONS FOR THE ROLE|Confirmed strengths/);
});
