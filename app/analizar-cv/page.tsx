import type { Metadata } from "next";
import { getSiteOrigin } from "../site-url";
import AtsAnalyzer from "./ats-analyzer";

const title = "Analizador de CV ATS con IA | AlineaCV";
const description = "Analiza tu CV en PDF o DOCX, detecta problemas ATS y genera una versión mejorada con IA sin inventar experiencia ni resultados.";

export async function generateMetadata(): Promise<Metadata> {
  const origin = await getSiteOrigin();
  const url = `${origin}/analizar-cv`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "es_PE",
      siteName: "AlineaCV",
      url,
      title,
      description,
      images: [],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [],
    },
  };
}

export default function AtsAnalyzerPage() {
  return <AtsAnalyzer />;
}
