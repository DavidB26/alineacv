import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AlineaCV — Analizador de CV ATS",
    short_name: "AlineaCV",
    description: "Analiza tu CV con una convocatoria o un puesto y recibe recomendaciones para mejorarlo.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafb",
    theme_color: "#0a1726",
    categories: ["business", "productivity", "education"],
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
