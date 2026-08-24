import type { Metadata, Viewport } from "next";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource-variable/source-serif-4";
import "./globals.css";
import { getSiteOrigin } from "./site-url";

const title = "Creador de CV Harvard y ATS gratis | AlineaCV";
const description = "Crea tu CV Harvard gratis, edítalo en español o inglés y expórtalo en PDF A4. Plantillas profesionales, legibles y compatibles con sistemas ATS.";

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#0a1726",
};

export async function generateMetadata(): Promise<Metadata> {
  const origin = await getSiteOrigin();

  return {
    metadataBase: new URL(origin),
    title: {
      default: title,
      template: "%s | AlineaCV",
    },
    description,
    applicationName: "AlineaCV",
    authors: [{ name: "AlineaCV", url: origin }],
    creator: "AlineaCV",
    publisher: "AlineaCV",
    category: "career",
    alternates: {
      canonical: origin,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      shortcut: "/favicon.svg",
    },
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: "website",
      locale: "es_PE",
      siteName: "AlineaCV",
      url: origin,
      title,
      description,
      images: [{ url: `${origin}/og.png`, width: 1731, height: 908, alt: "AlineaCV — Tu experiencia, bien alineada." }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const origin = await getSiteOrigin();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: origin,
        name: "AlineaCV",
        alternateName: "Alinea CV",
        description,
        inLanguage: ["es", "en"],
      },
      {
        "@type": "WebApplication",
        "@id": `${origin}/#application`,
        url: origin,
        name: "AlineaCV",
        description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
        inLanguage: ["es", "en"],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };

  return (
    <html lang="es">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </body>
    </html>
  );
}
