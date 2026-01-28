import Link from "next/link";
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
      <section className="bg-white">
        <div className="container py-14 md:py-20">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold tracking-widest uppercase text-[color:var(--color-muted-foreground)]">Travel editorial + merch</div>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight md:text-6xl">
              Discover stories, guides, and thoughtfully-made merch.
            </h1>
            <p className="mt-5 text-base text-[color:var(--color-muted-foreground)]">
              Bisogo is a headless experience: lightning-fast reads, clean shopping, and a seamless WooCommerce checkout.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/blog">Explore Travel</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/shop">Shop Merch</Link>
              </Button>
            </div>

            <div className="mt-10">
              <div className="text-sm font-medium">Get updates</div>
              <div className="mt-3">
                <NewsletterForm />
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
