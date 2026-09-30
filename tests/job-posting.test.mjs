import assert from "node:assert/strict";
import test from "node:test";
import { extractJobDescriptionFromHtml, parsePublicJobUrl } from "../app/analizar-cv/job-posting.mjs";

test("extracts a job posting from structured page data", () => {
  const html = `<html><head><script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": "Frontend Developer",
    "hiringOrganization": { "name": "Empresa Demo" },
    "description": "<p>Buscamos una persona para desarrollar interfaces empresariales.</p>",
    "responsibilities": "<ul><li>Crear componentes reutilizables con Vue.</li><li>Integrar APIs REST.</li></ul>",
    "qualifications": "<p>Experiencia con TypeScript, Git y pruebas automatizadas.</p>"
  }</script></head><body>Contenido decorativo</body></html>`;
  const description = extractJobDescriptionFromHtml(html);

  assert.match(description, /^Puesto: Frontend Developer/m);
  assert.match(description, /Empresa: Empresa Demo/);
  assert.match(description, /Crear componentes reutilizables con Vue/);
  assert.doesNotMatch(description, /<p>|<li>/);
});

test("extracts visible job content when structured data is unavailable", () => {
  const html = `<html><body><nav>Menú irrelevante</nav><main><h1>Diseñadora gráfica</h1><p>Crear identidades visuales y piezas para campañas.</p><ul><li>Dominio de Photoshop e Illustrator.</li><li>Experiencia preparando archivos para impresión.</li></ul><p>Trabajo coordinado con marketing y clientes internos.</p></main><footer>Aviso legal</footer></body></html>`;
  const description = extractJobDescriptionFromHtml(html);

  assert.match(description, /Diseñadora gráfica/);
  assert.match(description, /Photoshop e Illustrator/);
  assert.doesNotMatch(description, /Menú irrelevante|Aviso legal/);
});

test("accepts public job URLs and rejects local or private addresses", () => {
  assert.equal(parsePublicJobUrl("https://empresa.com/empleos/123")?.hostname, "empresa.com");
  assert.equal(parsePublicJobUrl("http://localhost:3000/job"), null);
  assert.equal(parsePublicJobUrl("http://192.168.1.10/job"), null);
  assert.equal(parsePublicJobUrl("file:///tmp/job.html"), null);
});
