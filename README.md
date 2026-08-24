# AlineaCV

Creador bilingüe de currículums Harvard y ATS con vista previa en tiempo real, guardado local y exportación A4 a PDF.

## Funciones de esta primera versión

- Editor por secciones: información personal, educación, experiencia y habilidades.
- Interfaz en español e inglés.
- Tres plantillas: Harvard Classic, Harvard Photo y Harvard Split.
- Fotografía opcional procesada únicamente en el navegador.
- Guardado automático en el dispositivo.
- Vista previa responsive y exportación mediante el diálogo de impresión del navegador.
- Analizador ATS local y mejora opcional mediante el nivel gratuito de Groq.

## Requisitos

- Node.js 22.13 o superior.

## Desarrollo

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Mejora de CV con IA

La revisión ATS básica funciona sin ninguna clave y se ejecuta en el navegador. Para habilitar la reescritura inteligente:

1. Crea una clave en `https://console.groq.com/keys`.
2. Copia `.env.example` como `.env.local`.
3. Añade la clave únicamente en `GROQ_API_KEY`.
4. Reinicia el servidor de desarrollo.

La clave se utiliza exclusivamente en la ruta del servidor y no se expone al navegador. Antes del envío, los datos de contacto e identificadores se sustituyen por marcadores que solo se restauran en el dispositivo. El modelo predeterminado es `openai/gpt-oss-120b`; puede cambiarse con `GROQ_MODEL`.

## Validación

```bash
npm run build
npm run lint
```
