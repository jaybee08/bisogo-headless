import type { MetadataRoute } from "next";
import { gqlClient } from "@/lib/graphql/client";
import { absoluteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const client = gqlClient({ revalidate: 1800, tags: ["posts", "pages"] });

  // Fetch a limited set of latest posts/pages for sitemap.
  // Expand as needed via pagination.
  const data = await client.request(`
    query Sitemap {
      posts(first: 100, where: { orderby: { field: DATE, order: DESC } }) {
        nodes { slug modified }
      }
      pages(first: 100, where: { orderby: { field: DATE, order: DESC } }) {
        nodes { slug modified }
      }
    }
  `);

  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const routes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date() },
    { url: absoluteUrl("/blog"), lastModified: new Date() },
    { url: absoluteUrl("/shop"), lastModified: new Date() },
    { url: absoluteUrl("/cart"), lastModified: new Date() },
    { url: absoluteUrl("/account"), lastModified: new Date() }
  ];

  for (const p of data?.posts?.nodes ?? []) {
    routes.push({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: p.modified ? new Date(p.modified) : undefined });
  }
  for (const pg of data?.pages?.nodes ?? []) {
    if (!pg.slug) continue;
    routes.push({ url: absoluteUrl(`/p/${pg.slug}`), lastModified: pg.modified ? new Date(pg.modified) : undefined });
  }

  return routes;
}
