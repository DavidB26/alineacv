import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AlineaCV — Creador de CV Harvard y ATS",
    short_name: "AlineaCV",
    description: "Crea un CV Harvard profesional, legible y compatible con ATS de forma gratuita.",
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
