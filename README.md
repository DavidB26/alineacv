# AlineaCV

Landing bilingüe para revisar un CV frente a una convocatoria o un puesto objetivo.

## Flujo

1. Sube un PDF o DOCX con texto seleccionable (máximo 10 MB).
2. Pega una convocatoria o escribe el puesto que buscas.
3. Recibe hasta tres acciones prioritarias y el detalle de 21 comprobaciones del documento.
4. Copia el CV reorganizado o guárdalo en PDF.

La convocatoria permite comparar palabras clave conocidas. El porcentaje no representa una probabilidad de selección ni valida todos los requisitos. Con solo el puesto, se orienta el perfil usando la experiencia existente y se revisa el documento sin inventar requisitos ni mostrar un porcentaje de coincidencia.

La lectura y el análisis se realizan en el navegador. No se requieren claves de IA, cuentas ni envío del CV a servidores. La exportación reorganiza las secciones conservando el texto original; no aplica automáticamente las recomendaciones.

La portada contiene el flujo completo. La dirección anterior `/analizar-cv` redirige a `/`. El creador anterior se conserva en `app/legacy-builder.tsx` como código de referencia y no está expuesto como una página. El flujo no consulta vacantes externas ni necesita una base de datos.

## Desarrollo

Node.js 22.13 o superior. Se preservan el gestor y las dependencias del proyecto.

```bash
pnpm install
pnpm dev
```

Origen local: `http://localhost:3000`. El origen público se configura mediante `NEXT_PUBLIC_SITE_URL`.

## Validación

```bash
pnpm build
pnpm lint
node --test tests/*.test.mjs
```
