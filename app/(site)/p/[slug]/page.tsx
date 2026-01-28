import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPageBySlug } from "@/lib/data";
import { canonicalFor } from "@/lib/seo/metadata";
import { stripHtml } from "@/lib/utils";
import { JsonLd, webpageJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 600;

type Params = { slug: string };

function decodeSlug(raw: string) {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return String(raw || "").trim();
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  if (!slug) return { title: "Not Found — Bisogo" };

  const res = await fetchPageBySlug(slug);
  const page = res?.page;
  if (!page) return { title: "Not Found — Bisogo", robots: { index: false, follow: false } };

  const title = stripHtml(page.title || "Page");
  const desc = stripHtml(page.excerpt || page.content || "").slice(0, 160);
  const canonical = canonicalFor(`/p/${slug}`);

  return {
    title: `${title} — Bisogo`,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title,
      description: desc,
      url: canonical,
      type: "website",
    },
  };
}

export default async function PageSlug({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  if (!slug) return notFound();

  const res = await fetchPageBySlug(slug);
  const page = res?.page;
  if (!page) return notFound();

  const canonical = canonicalFor(`/p/${slug}`);

  return (
    <article className="container py-10">
      <JsonLd
        data={webpageJsonLd({
          url: canonical,
          name: stripHtml(page.title || ""),
          description: stripHtml(page.excerpt || page.content || "").slice(0, 160),
        })}
      />

      <h1 className="text-4xl font-semibold tracking-tight">{page.title}</h1>

      <div className="mt-6 prose prose-slate max-w-none">
        <div dangerouslySetInnerHTML={{ __html: page.content || "" }} />
      </div>
    </article>
  );
}