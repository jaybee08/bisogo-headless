import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProductBySlug, normalizePrice } from "@/lib/data";
import { canonicalFor } from "@/lib/seo/metadata";
import { JsonLd, productJsonLd } from "@/lib/seo/jsonld";
import { stripHtml } from "@/lib/utils";
import { AddToCart } from "@/components/product/add-to-cart";

export const revalidate = 600;

// IMPORTANT in your setup: params behaves like a Promise
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
  if (!slug) return { title: "Product not found", robots: { index: false, follow: false } };

  const res = await fetchProductBySlug(slug);
  const product = res?.__rest ? res.product : res?.product;

  if (!product) {
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
      openGraph: { title: "Product not found", type: "website" },
    };
  }

  const isRest = Boolean(res?.__rest);
  const name = product.name;
  const shortDescription = isRest ? product.short_description : product.shortDescription;

  const images: string[] = isRest
    ? (product.images || []).map((i: any) => i?.src).filter(Boolean)
    : [
        product.image?.sourceUrl,
        ...(product.galleryImages?.nodes || []).map((n: any) => n?.sourceUrl),
      ].filter(Boolean);

  return {
    title: `${name} | Bisogo`,
    description: stripHtml(shortDescription || "").slice(0, 160),
    alternates: { canonical: canonicalFor(`/product/${slug}`) },
    openGraph: {
      title: name,
      description: stripHtml(shortDescription || "").slice(0, 200),
      type: "website",
      images: images.length ? images.map((url) => ({ url })) : undefined,
    },
  };
}

export default async function ProductDetail({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  if (!slug) return notFound();

  const res = await fetchProductBySlug(slug);
  const product = res?.__rest ? res.product : res?.product;
  if (!product) return notFound();

  const isRest = Boolean(res?.__rest);

  const name = product.name;
  const shortDescription = isRest ? product.short_description : product.shortDescription;
  const description = isRest ? product.description : product.description;

  // --- images
  const images = isRest
    ? (product.images || []).map((i: any) => ({
        url: i?.src,
        alt: i?.alt || name,
      })).filter((x: any) => Boolean(x.url))
    : [
        ...(product.image?.sourceUrl
          ? [{
              url: product.image.sourceUrl,
              alt: product.image.altText || name,
            }]
          : []),
        ...((product.galleryImages?.nodes || [])
          .map((n: any) => ({ url: n?.sourceUrl, alt: n?.altText || name }))
          .filter((x: any) => Boolean(x.url))),
      ];

  const mainImg = images?.[0]?.url ?? null;

  // --- price + stock
  const basePrice = normalizePrice(isRest ? product.price : product.price).raw;
  const currency = "PHP";

  const stock = (() => {
    const status = (isRest ? product.stock_status : product.stockStatus) || "";
    return String(status).toLowerCase().includes("out") ? "OutOfStock" : "InStock";
  })() as "InStock" | "OutOfStock";

  // --- productId mapping
  const productId = (() => {
    if (isRest) return Number(product.id);
    // WPGraphQL Woo usually has databaseId on product
    if (typeof product.databaseId === "number") return product.databaseId;
    return 0;
  })();

  // --- attributes + variations mapping (best effort)
  const attributes = isRest
    ? (product.attributes || [])
        .filter((a: any) => Array.isArray(a.options) && a.options.length)
        .map((a: any) => ({ name: a.name, options: a.options }))
    : (product.attributes?.nodes || [])
        .filter((a: any) => Array.isArray(a.options) && a.options.length)
        .map((a: any) => ({ name: a.name, options: a.options }));

  const variations = isRest
    ? []
    : (product.variations?.nodes || [])
        .map((v: any) => ({
          id: v.databaseId,
          name: v.name,
          price: normalizePrice(v.price).raw,
          stockStatus: v.stockStatus,
          attributes: (v.attributes?.nodes || []).reduce((acc: any, n: any) => {
            acc[n.name] = n.value;
            return acc;
          }, {}),
        }))
        .filter((v: any) => typeof v.id === "number");

  // --- JSON-LD
  const ld = productJsonLd({
    url: canonicalFor(`/product/${slug}`),
    name,
    description: stripHtml(shortDescription || "").slice(0, 300),
    image: images.map((i: any) => i.url),
    sku: (isRest ? product.sku : product.sku) || undefined,
    price: basePrice,
    currency,
    availability: stock,
  });

  return (
    <div className="container py-10">
      <JsonLd data={ld} />

      <div className="mb-6 text-sm">
        <Link href="/shop" className="underline-offset-4 hover:underline">
          ← Back to shop
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
            {mainImg ? (
              <Image
                src={mainImg}
                alt={images?.[0]?.alt || name}
                width={1400}
                height={1400}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <div className="h-full w-full" />
            )}
          </div>

          {images.length > 1 ? (
            <div className="grid grid-cols-4 gap-3">
              {images.slice(1, 5).map((img: any, idx: number) => (
                <div
                  key={`${img.url}-${idx}`}
                  className="aspect-square overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-muted)]"
                >
                  <Image
                    src={img.url}
                    alt={img.alt || name}
                    width={400}
                    height={400}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
            <div className="text-lg font-medium">₱{basePrice.toFixed(2)}</div>
            {shortDescription ? (
              <div
                className="prose prose-slate max-w-none text-sm text-[color:var(--color-muted-foreground)]"
                dangerouslySetInnerHTML={{ __html: shortDescription }}
              />
            ) : null}
          </div>

          {/* Add to cart */}
          <AddToCart
            product={{
              productId,
              slug,
              name,
              image: mainImg,
              basePrice,
              currency,
              attributes,
              variations,
            }}
          />

          {/* CRO / Trust */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-4 text-sm">
              <div className="font-semibold">Fast checkout</div>
              <div className="mt-1 text-[color:var(--color-muted-foreground)]">Pay via WooCommerce.</div>
            </div>
            <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-4 text-sm">
              <div className="font-semibold">Secure payments</div>
              <div className="mt-1 text-[color:var(--color-muted-foreground)]">Gateway processed on CMS.</div>
            </div>
            <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-4 text-sm">
              <div className="font-semibold">Local delivery</div>
              <div className="mt-1 text-[color:var(--color-muted-foreground)]">PH-ready setup.</div>
            </div>
          </div>

          {/* Details */}
          {description ? (
            <div className="pt-2">
              <div className="text-sm font-semibold">Details</div>
              <div
                className="prose prose-slate mt-3 max-w-none"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}