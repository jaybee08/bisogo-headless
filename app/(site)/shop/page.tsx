import type { Metadata } from "next";
import Link from "next/link";
import { fetchProductsIndex, isWooGraphQLAvailable } from "@/lib/data";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/state/empty";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { canonicalFor } from "@/lib/seo/metadata";
import { NewsletterForm } from "@/components/newsletter-form";

export const revalidate = 600;

type SearchParams = {
  q?: string;
  category?: string;
  page?: string;
  sort?: string;
};

type NormalizedImage = {
  url: string | null;
  alt: string | null;
  thumbnail: string | null;
  medium: string | null;
  large: string | null;
};

function getRestImage(img?: any): NormalizedImage {
  if (!img) {
    return {
      url: null,
      alt: null,
      thumbnail: null,
      medium: null,
      large: null,
    };
  }

  return {
    url: img.src || null,
    alt: img.alt || null,
    thumbnail: img.thumbnail || img.src || null,
    medium: img.medium || img.src || null,
    large: img.large || img.src || null,
  };
}

function getGqlImage(img?: any): NormalizedImage {
  if (!img) {
    return {
      url: null,
      alt: null,
      thumbnail: null,
      medium: null,
      large: null,
    };
  }

  const sizes = Array.isArray(img.mediaDetails?.sizes) ? img.mediaDetails.sizes : [];

  return {
    url: img.sourceUrl || null,
    alt: img.altText || null,
    thumbnail:
      sizes.find((s: any) => s?.name === "thumbnail")?.sourceUrl ||
      img.sourceUrl ||
      null,
    medium:
      sizes.find((s: any) => s?.name === "medium")?.sourceUrl ||
      sizes.find((s: any) => s?.name === "medium_large")?.sourceUrl ||
      img.sourceUrl ||
      null,
    large:
      sizes.find((s: any) => s?.name === "large")?.sourceUrl ||
      img.sourceUrl ||
      null,
  };
}

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

  await isWooGraphQLAvailable();

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
        regularPrice: p.regular_price,
        salePrice: p.sale_price,
        onSale: Boolean(p.on_sale),
        image: getRestImage(p.images?.[0]),
      };
    }

    const gqlOnSale = Boolean(p.onSale ?? p.on_sale);
    const gqlRegular = p.regularPrice ?? p.regular_price ?? null;
    const gqlSale = p.salePrice ?? p.sale_price ?? null;

    return {
      slug: p.slug,
      name: p.name,
      price: p.price,
      regularPrice: gqlRegular,
      salePrice: gqlSale,
      onSale: gqlOnSale,
      image: getGqlImage(p.image),
    };
  });

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Shop</h1>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
            New drops for camping, travel, and summer style—ships nationwide.
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
                <ProductCard
                  key={p.slug}
                  slug={p.slug}
                  name={p.name}
                  price={p.price}
                  image={p.image}
                  regularPrice={p.regularPrice}
                  salePrice={p.salePrice}
                  onSale={p.onSale}
                />
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
            <div className="text-sm font-semibold">Your cart</div>
            <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
              Items are saved on this device so you can pick up where you left off.
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/cart">View cart</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-4">
            <div className="text-sm font-semibold">Get updates</div>
            <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
              New guides + curated drops, once a week.
            </p>
            <NewsletterForm />
          </div>
        </aside>
      </div>
    </div>
  );
}