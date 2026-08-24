import type { MetadataRoute } from "next";
import { getSiteOrigin } from "./site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getSiteOrigin();

  return [
    {
      url: origin,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${origin}/analizar-cv`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
