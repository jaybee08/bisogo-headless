import type { Metadata } from "next";
import Link from "next/link";
import { fetchPostsIndex } from "@/lib/data";
import { PostCard } from "@/components/blog/post-card";
import { EmptyState } from "@/components/state/empty";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { canonicalFor } from "@/lib/seo/metadata";

export const revalidate = 600;

type SearchParams = {
  q?: string;
  category?: string;
  tag?: string;
  after?: string;
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const canonical = canonicalFor(`/blog${sp.q || sp.category || sp.tag || sp.after ? "" : ""}`);
  const titleBits = ["Blog"];
  if (sp.q) titleBits.push(`Search: ${sp.q}`);
  if (sp.category) titleBits.push(`Category: ${sp.category}`);
  if (sp.tag) titleBits.push(`Tag: ${sp.tag}`);
  return {
    title: titleBits.join(" · "),
    alternates: { canonical }
  };
}

function buildQuery(sp: SearchParams) {
  const qs = new URLSearchParams();
  if (sp.q) qs.set("q", sp.q);
  if (sp.category) qs.set("category", sp.category);
  if (sp.tag) qs.set("tag", sp.tag);
  if (sp.after) qs.set("after", sp.after);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export default async function BlogIndex({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const res = await fetchPostsIndex({
    first: 9,
    after: sp.after || null,
    search: sp.q || null,
    category: sp.category || null,
    tag: sp.tag || null
  });

  const posts = res?.posts?.nodes ?? [];
  const pageInfo = res?.posts?.pageInfo;
  const categories = res?.categories?.nodes ?? [];
  const tags = res?.tags?.nodes ?? [];

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Travel Blog</h1>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">Stories, guides, and practical tips.</p>
        </div>

        <form className="flex w-full max-w-md gap-2" action="/blog" method="get">
          <Input name="q" placeholder="Search posts…" defaultValue={sp.q || ""} />
          <Button type="submit" variant="outline">Search</Button>
        </form>
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_280px]">
        <div>
          {posts.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              {posts.map((p: any) => (
                <PostCard
                  key={p.id}
                  slug={p.slug}
                  title={p.title}
                  excerpt={p.excerpt}
                  date={p.date}
                  image={{ url: p.featuredImage?.node?.sourceUrl, alt: p.featuredImage?.node?.altText }}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No posts found" description="Try a different search or remove filters." />
          )}

          {pageInfo?.hasNextPage ? (
            <div className="mt-8 flex justify-center">
              <Button asChild variant="outline">
                <Link href={`/blog${buildQuery({ ...sp, after: pageInfo.endCursor })}`}>Load more</Link>
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="space-y-8">
          <div>
            <div className="text-sm font-semibold">Categories</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/blog" className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-xs hover:bg-[color:var(--color-muted)]">All</Link>
              {categories.map((c: any) => (
                <Link
                  key={c.slug}
                  href={`/blog?category=${encodeURIComponent(c.slug)}`}
                  className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-xs hover:bg-[color:var(--color-muted)]"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold">Tags</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.slice(0, 20).map((t: any) => (
                <Link
                  key={t.slug}
                  href={`/blog?tag=${encodeURIComponent(t.slug)}`}
                  className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-xs hover:bg-[color:var(--color-muted)]"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
