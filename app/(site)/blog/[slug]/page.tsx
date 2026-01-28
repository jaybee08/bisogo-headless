import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPostBySlug, fetchRelatedPosts } from "@/lib/data";

type Params = { slug: string };

function stripHtml(html: string) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, n = 160) {
  const t = String(s || "");
  if (t.length <= n) return t;
  return t.slice(0, n - 1).trimEnd() + "…";
}

function decodeSlug(raw: string) {
  const v = String(raw || "").trim();
  if (!v) return "";
  try {
    return decodeURIComponent(v).trim();
  } catch {
    return v;
  }
}

function pickPost(res: any) {
  return res?.posts?.nodes?.[0] ?? null;
}

function isoDate(d?: string) {
  const s = String(d || "").trim();
  if (!s) return undefined;
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
}

function jsonLdScript(obj: any) {
  return JSON.stringify(obj, null, 0);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const p = await params;
  const slug = decodeSlug(p?.slug);
  if (!slug) return { title: "Not Found — Bisogo" };

  const res = await fetchPostBySlug(slug);
  const post = pickPost(res);
  if (!post) return { title: "Not Found — Bisogo" };

  const title = stripHtml(post.title);
  const description = truncate(stripHtml(post.excerpt || post.content || ""), 160);
  const canonical = `https://bisogo.ph/blog/${encodeURIComponent(slug)}`;
  const image = post.featuredImage?.node?.sourceUrl;

  return {
    title: `${title} — Bisogo`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} — Bisogo`,
      description,
      url: canonical,
      type: "article",
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — Bisogo`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const p = await params;
  const slug = decodeSlug(p?.slug);
  if (!slug) return notFound();

  const res = await fetchPostBySlug(slug);
  const post = pickPost(res);
  if (!post) return notFound();

  const canonical = `https://bisogo.ph/blog/${encodeURIComponent(slug)}`;

  const titleText = stripHtml(post.title);
  const descText = truncate(stripHtml(post.excerpt || post.content || ""), 200);
  const authorName = post.author?.node?.name || "Bisogo";
  const published = isoDate(post.date);
  const modified = isoDate(post.modified) || published;
  const imageUrl = post.featuredImage?.node?.sourceUrl || "";
  const imageAlt = post.featuredImage?.node?.altText || titleText;

  const categories = post.categories?.nodes ?? [];
  const tags = post.tags?.nodes ?? [];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    headline: titleText,
    description: descText,
    author: { "@type": "Person", name: authorName },
    publisher: {
      "@type": "Organization",
      name: "Bisogo",
    },
    datePublished: published,
    dateModified: modified,
    image: imageUrl ? [imageUrl] : undefined,
    keywords: [
      ...categories.map((c: any) => c?.name).filter(Boolean),
      ...tags.map((t: any) => t?.name).filter(Boolean),
    ].join(", "),
  };

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://bisogo.ph" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://bisogo.ph/blog" },
      { "@type": "ListItem", position: 3, name: titleText, item: canonical },
    ],
  };

  // Related posts (CRO: keep them reading)
  const relatedRes = post.id ? await fetchRelatedPosts(post.id) : null;
  const related = relatedRes?.posts?.nodes ?? [];

  return (
    <article className="container py-10">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbsJsonLd) }} />

      {/* Breadcrumbs */}
      <nav className="text-xs text-[color:var(--color-muted-foreground)]">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:underline">Blog</Link>
      </nav>

      {/* Header */}
      <header className="mt-6 max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight">{post.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[color:var(--color-muted-foreground)]">
          <span className="text-[color:var(--color-foreground)]">{authorName}</span>
          {published ? <span>·</span> : null}
          {published ? <time dateTime={published}>{new Date(published).toLocaleDateString()}</time> : null}

          {/* Categories */}
          {categories.length ? (
            <>
              <span>·</span>
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 2).map((c: any) => (
                  <Link
                    key={c.slug}
                    href={`/blog?category=${encodeURIComponent(c.slug)}`}
                    className="rounded-full border border-[color:var(--color-border)] px-2 py-0.5 text-xs hover:bg-[color:var(--color-muted)]"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </header>

      {/* Featured image */}
      {imageUrl ? (
        <div className="mt-8 overflow-hidden rounded-xl border border-[color:var(--color-border)]">
          {/* Using next/image for better performance */}
          <div className="relative aspect-[16/9] w-full">
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 900px"
              priority
            />
          </div>
        </div>
      ) : null}

      {/* Content + sidebar CRO */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        {/* Content */}
        <div className="max-w-none">
          <div
            className="prose prose-slate max-w-none
              prose-headings:tracking-tight
              prose-a:text-[color:var(--color-primary)]
              prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-img:border prose-img:border-[color:var(--color-border)]
            "
            dangerouslySetInnerHTML={{ __html: post.content || "" }}
          />

          {/* Tags */}
          {tags.length ? (
            <div className="mt-10 flex flex-wrap gap-2">
              {tags.slice(0, 12).map((t: any) => (
                <Link
                  key={t.slug}
                  href={`/blog?tag=${encodeURIComponent(t.slug)}`}
                  className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-xs hover:bg-[color:var(--color-muted)]"
                >
                  #{t.name}
                </Link>
              ))}
            </div>
          ) : null}

          {/* Related posts */}
          {related.length ? (
            <section className="mt-12">
              <div className="flex items-end justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Related reads</h2>
                <Link href="/blog" className="text-sm text-[color:var(--color-muted-foreground)] hover:underline">
                  View all
                </Link>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {related.slice(0, 4).map((r: any) => (
                  <Link
                    key={r.id}
                    href={`/blog/${encodeURIComponent(r.slug)}`}
                    className="rounded-xl border border-[color:var(--color-border)] p-4 hover:bg-[color:var(--color-muted)]"
                  >
                    <div className="text-sm font-medium">{stripHtml(r.title)}</div>
                    <div className="mt-2 line-clamp-2 text-xs text-[color:var(--color-muted-foreground)]">
                      {stripHtml(r.excerpt || "")}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* CRO sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 h-fit">
          {/* Shop CTA */}
          <div className="rounded-xl border border-[color:var(--color-border)] p-5">
            <div className="text-sm font-semibold">Shop Bisogo merch</div>
            <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
              Minimal travel essentials and limited drops.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm hover:bg-[color:var(--color-muted)]"
              >
                Browse shop
              </Link>
              <Link
                href="/cart"
                className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-4 py-2 text-sm text-white"
              >
                View cart
              </Link>
            </div>
          </div>

          {/* Newsletter */}
          <div className="rounded-xl border border-[color:var(--color-border)] p-5">
            <div className="text-sm font-semibold">Get travel drops</div>
            <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
              1 email/week. Guides, gear picks, and new merch.
            </p>
            <form className="mt-4 flex gap-2" action="/api/newsletter" method="post">
              <input
                type="email"
                name="email"
                placeholder="you@email.com"
                required
                className="w-full rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-[color:var(--color-primary)] px-4 py-2 text-sm text-white"
              >
                Join
              </button>
            </form>
            <p className="mt-2 text-xs text-[color:var(--color-muted-foreground)]">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}