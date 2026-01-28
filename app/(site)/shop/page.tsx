import type { Metadata } from "next";
import Link from "next/link";
import { fetchProductsIndex, isWooGraphQLAvailable } from "@/lib/data";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/state/empty";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { canonicalFor } from "@/lib/seo/metadata";

export const revalidate = 600;

type SearchParams = {
  q?: string;
  category?: string;
  page?: string;
  sort?: string;
};

function makeQS(sp: Record<string, any>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Shop", alternates: { canonical: canonicalFor("/shop") } };
}

export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};

  const page = Math.max(1, Number(sp.page || "1") || 1);
  const sort = sp.sort || "latest";

  const wooGql = await isWooGraphQLAvailable();

  const res = await fetchProductsIndex({
    first: 12,
    page,
    search: sp.q || null,
    categorySlug: sp.category || null,
    sort,
  });

  const categories = res?.__rest
    ? (res.categories ?? [])
    : (res?.productCategories?.nodes ?? []);
  const products = res?.__rest ? res.products ?? [] : res?.products?.nodes ?? [];
  const pageInfo = res?.products?.pageInfo;

  const items = products.map((p: any) => {
    if (res?.__rest) {
      return {
        slug: p.slug,
        name: p.name,
        price: p.price,
        image: { url: p.images?.[0]?.src || null, alt: p.images?.[0]?.alt || null },
      };
    }
    return {
      slug: p.slug,
      name: p.name,
      price: p.price,
      image: { url: p.image?.sourceUrl || null, alt: p.image?.altText || null },
    };
  });

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Shop</h1>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
            Clean product browsing with a frontend cart and Woo checkout.
          </p>
          <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
            Products source: {wooGql ? "WPGraphQL WooCommerce" : "WooCommerce REST fallback"}
          </p>
        </div>

        <form className="flex w-full max-w-md gap-2" action="/shop" method="get">
          <Input name="q" placeholder="Search products…" defaultValue={sp.q || ""} />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/shop"
                className="rounded-full border border-[color:var(--color-border)] px-3 py-1 hover:bg-[color:var(--color-muted)]"
              >
                All
              </Link>
              {categories.slice(0, 20).map((c: any) => (
                <Link
                  key={c.slug}
                  href={`/shop?category=${encodeURIComponent(c.slug)}`}
                  className="rounded-full border border-[color:var(--color-border)] px-3 py-1 hover:bg-[color:var(--color-muted)]"
                >
                  {c.name}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-[color:var(--color-muted-foreground)]">Sort:</span>
              <Link href={`/shop${makeQS({ ...sp, sort: "latest", page: 1 })}`} className="hover:underline">
                Latest
              </Link>
              <span>·</span>
              <Link href={`/shop${makeQS({ ...sp, sort: "price-asc", page: 1 })}`} className="hover:underline">
                Price ↑
              </Link>
              <span>·</span>
              <Link href={`/shop${makeQS({ ...sp, sort: "price-desc", page: 1 })}`} className="hover:underline">
                Price ↓
              </Link>
            </div>
          </div>

          {items.length ? (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {items.map((p: any) => (
                <ProductCard key={p.slug} slug={p.slug} name={p.name} price={p.price} image={p.image} />
              ))}
            </div>
          ) : (
            <EmptyState title="No products found" description="Try a different search or filter." />
          )}

          {res?.__rest ? (
            <div className="mt-8 flex justify-center gap-3">
              {page > 1 ? (
                <Button asChild variant="outline">
                  <Link href={`/shop${makeQS({ ...sp, page: page - 1 })}`}>Previous</Link>
                </Button>
              ) : null}
              {items.length === 12 ? (
                <Button asChild variant="outline">
                  <Link href={`/shop${makeQS({ ...sp, page: page + 1 })}`}>Next</Link>
                </Button>
              ) : null}
            </div>
          ) : pageInfo?.hasNextPage ? (
            <div className="mt-8 flex justify-center">
              <Button asChild variant="outline">
                <Link href={`/shop${makeQS({ ...sp, page: page + 1 })}`}>Next page</Link>
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-4">
            <div className="text-sm font-semibold">Cart</div>
            <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
              Cart is stored in your browser and does not depend on WooCommerce cookies.
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/cart">Go to cart</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-4">
            <div className="text-sm font-semibold">Need a page?</div>
            <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
              WordPress pages are available at <span className="font-mono">/p/[slug]</span>.
            </p>
            <div className="mt-4 flex gap-2 text-sm">
              <Link href="/p/about" className="underline-offset-4 hover:underline">
                About
              </Link>
              <span>·</span>
              <Link href="/p/contact" className="underline-offset-4 hover:underline">
                Contact
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}