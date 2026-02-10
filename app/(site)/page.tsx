import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { NewsletterForm } from "@/components/newsletter-form";
import { fetchPostsIndex, fetchProductsIndex } from "@/lib/data";
import { PostCard } from "@/components/blog/post-card";
import { ProductCard } from "@/components/product/product-card";
import { canonicalFor } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Home",
    alternates: { canonical: canonicalFor("/") }
  };
}

export default async function HomePage() {
  const postsRes = await fetchPostsIndex({ first: 3 });
  const posts = postsRes?.posts?.nodes ?? [];

  const productsRes = await fetchProductsIndex({ first: 4, page: 1 });
  const products = productsRes?.__rest
    ? productsRes.products ?? []
    : productsRes?.products?.nodes ?? [];

  const productCardData = products.map((p: any) => {
    if (productsRes?.__rest) {
      return {
        slug: p.slug,
        name: p.name,
        price: p.price,
        image: { url: p.images?.[0]?.src || null, alt: p.images?.[0]?.alt || null }
      };
    }
    return {
      slug: p.slug,
      name: p.name,
      price: p.price,
      image: { url: p.image?.sourceUrl || null, alt: p.image?.altText || null }
    };
  });

  return (
    <div>
      <section className="relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/hero-2.jpg"
            alt="Bisogo — Philippines travel stories and curated essentials"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          {/* subtle overlay for readability */}
          <div className="absolute inset-0 bg-black/10" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-black/10" />
        </div>

        <div className="container relative py-14 md:py-20">
          <div className="grid items-end gap-10 lg:grid-cols-12">
            {/* Left panel */}
            <div className="lg:col-span-7">
              <div className="max-w-2xl rounded-3xl border border-white/30 bg-white/45 p-6 shadow-lg ring-1 ring-black/5 backdrop-blur-xl md:p-10">
                <div className="text-xs font-semibold tracking-widest uppercase text-[color:var(--color-muted-foreground)]">
                  PH travel blog + shop
                </div>

                <h1 className="mt-4 text-5xl font-semibold tracking-tight md:text-6xl">
                  Stories, guides, and summer-ready finds.
                </h1>

                <p className="mt-5 text-base text-[color:var(--color-muted-foreground)]">
                  From island weekends to mountain camps—read local travel guides and shop curated essentials:
                  camping, travel, and warm-weather fits.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/blog">Explore Travel</Link>
                  </Button>
                  <Button variant="outline" asChild className="bg-white/70">
                    <Link href="/shop">Shop Essentials</Link>
                  </Button>
                </div>

                {/* chips */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {["Camping", "Beach", "City", "Food", "Summer Fits"].map((label) => (
                    <span
                      key={label}
                      className="rounded-full border bg-white/70 px-3 py-1 text-sm text-[color:var(--color-muted-foreground)] backdrop-blur"
                    >
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-5 text-sm text-[color:var(--color-muted-foreground)]">
                  Curated in the Philippines • New drops weekly • Ships nationwide
                </div>

                {/* Newsletter (moved lower, less competing with CTAs) */}
                <div className="mt-8">
                  <div className="text-sm font-medium">Get updates</div>
                  <div className="mt-3">
                    <NewsletterForm />
                  </div>
                </div>
              </div>
            </div>

            {/* Right floating "Top Picks" card */}
            <div className="lg:col-span-5">
              <div className="mx-auto max-w-md rounded-3xl border bg-white/70 p-5 shadow-sm backdrop-blur-md md:p-6">
                <div className="text-sm font-semibold">Top Picks</div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {productCardData.slice(0, 3).map((p: any) => (
                    <Link
                      key={p.slug}
                      href={`/product/${p.slug}`}
                      className="group rounded-2xl border bg-white/70 p-2 transition hover:bg-white"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                        {p.image?.url ? (
                          <Image
                            src={p.image.url}
                            alt={p.image.alt ?? p.name}
                            fill
                            className="object-cover transition group-hover:scale-[1.03]"
                            sizes="120px"
                          />
                        ) : null}
                      </div>
                      <div className="mt-2 line-clamp-1 text-xs font-medium">{p.name}</div>
                      <div className="text-[11px] text-[color:var(--color-muted-foreground)]">{p.price}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Featured travel</h2>
            <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">Latest posts from the blog.</p>
          </div>
          <Link href="/blog" className="text-sm underline-offset-4 hover:underline">View all</Link>
        </div>

        <div className="grid gap-5 md:gap-8 md:grid-cols-3">
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
      </section>

      <section className="container pb-14 md:pb-20">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Featured products</h2>
            <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">A few picks from the shop.</p>
          </div>
          <Link href="/shop" className="text-sm underline-offset-4 hover:underline">Browse shop</Link>
        </div>

        <div className="grid gap-5 md:gap-8 sm:grid-cols-2 md:grid-cols-4">
          {productCardData.map((p: any) => (
            <ProductCard key={p.slug} slug={p.slug} name={p.name} price={p.price} image={p.image} />
          ))}
        </div>
      </section>
      
    </div>
  );
}
