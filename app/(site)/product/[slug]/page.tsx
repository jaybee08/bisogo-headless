import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProductBySlug, normalizePrice } from "@/lib/data";
import { canonicalFor } from "@/lib/seo/metadata";
import { JsonLd, productJsonLd } from "@/lib/seo/jsonld";
import { stripHtml } from "@/lib/utils";
import { AddToCart } from "@/components/product/add-to-cart";
import { UspsCarousel } from "@/components/product/usps-carousel";
import { ProductGallery } from "@/components/product/product-gallery";
import { StickyAtc } from "@/components/product/sticky-atc";
import { PdpFaq } from "@/components/product/pdp-faq";
import { Ymal } from "@/components/product/ymal";
import { listProductsSimple } from "@/lib/woo/rest";

export const revalidate = 600;

type Params = { slug: string };

function decodeSlug(raw: string) {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return String(raw || "").trim();
  }
}

/**
 * ✅ Sale pricing helper (REST-first; best-effort for GraphQL)
 */
function getSalePricing(product: any, isRest: boolean) {
  if (isRest) {
    const onSale = Boolean(product?.on_sale);
    const regular = normalizePrice(product?.regular_price ?? product?.price).raw;
    const sale = normalizePrice(product?.sale_price ?? product?.price).raw;

    const hasRealSale =
      onSale &&
      Number.isFinite(regular) &&
      Number.isFinite(sale) &&
      sale > 0 &&
      sale < regular;

    return {
      onSale: hasRealSale,
      regularPrice: regular,
      salePrice: hasRealSale ? sale : regular,
    };
  }

  const rawPrice = normalizePrice(product?.price).raw;

  const regularMaybe = normalizePrice(
    product?.regularPrice ?? product?.regular_price ?? product?.price
  ).raw;
  const saleMaybe = normalizePrice(
    product?.salePrice ?? product?.sale_price ?? product?.price
  ).raw;

  const hasRealSale =
    Number.isFinite(regularMaybe) &&
    Number.isFinite(saleMaybe) &&
    saleMaybe > 0 &&
    saleMaybe < regularMaybe &&
    (String(product?.onSale).toLowerCase() === "true" ||
      String(product?.on_sale).toLowerCase() === "true");

  return {
    onSale: hasRealSale,
    regularPrice: hasRealSale ? regularMaybe : rawPrice,
    salePrice: hasRealSale ? saleMaybe : rawPrice,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  if (!slug) {
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
  }

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
    ? (product.images || [])
        .map((i: any) => ({
          url: i?.src,
          alt: i?.alt || name,
        }))
        .filter((x: any) => Boolean(x.url))
    : [
        ...(product.image?.sourceUrl
          ? [
              {
                url: product.image.sourceUrl,
                alt: product.image.altText || name,
              },
            ]
          : []),
        ...((product.galleryImages?.nodes || [])
          .map((n: any) => ({ url: n?.sourceUrl, alt: n?.altText || name }))
          .filter((x: any) => Boolean(x.url))),
      ];

  const mainImg = images?.[0]?.url ?? null;

  // --- pricing (✅ sale support)
  const currency = "PHP";
  const pricing = getSalePricing(product, isRest);
  const displayPrice = pricing.salePrice;

  // --- stock
  const stockStatusRaw = (isRest ? product.stock_status : product.stockStatus) || "";
  const stock = String(stockStatusRaw).toLowerCase().includes("out") ? "OutOfStock" : "InStock";

  // --- inventory / low-stock messaging (REST best-effort)
  const stockQty = isRest ? Number(product?.stock_quantity ?? product?.stockQuantity ?? NaN) : NaN;
  const lowStockThreshold = isRest ? Number(product?.low_stock_amount ?? product?.lowStockAmount ?? NaN) : NaN;

  const showOnlyLeft =
    stock === "InStock" &&
    Number.isFinite(stockQty) &&
    stockQty > 0 &&
    (Number.isFinite(lowStockThreshold) ? stockQty <= lowStockThreshold : stockQty <= 5);

  // ✅ sold individually + max qty (REST reliable; GraphQL best-effort)
  const soldIndividually = Boolean(
    isRest ? product?.sold_individually : product?.soldIndividually ?? product?.sold_individually
  );

  const maxPurchaseQty =
    isRest && Number.isFinite(Number(product?.max_purchase_quantity))
      ? Number(product?.max_purchase_quantity)
      : soldIndividually
        ? 1
        : undefined;

  // ✅ NEW: backorders support (REST reliable; GraphQL best-effort)
  // Woo REST typically: "no" | "notify" | "yes"
  const backorders = (isRest ? product?.backorders : product?.backorders) as "no" | "notify" | "yes" | undefined;

  // ✅ Pass stock to ATC so it can disable when stock is fully in cart (only when backorders = no)
  const passStockQty = Number.isFinite(stockQty) ? stockQty : null;
  const passStockStatus = isRest ? product?.stock_status : product?.stockStatus;

  // --- productId mapping
  const productId = (() => {
    if (isRest) return Number(product.id);
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

  // --- USPs from REST meta (_product_usps)
  const usps = Array.isArray((product as any).usps) ? (product as any).usps : [];

  // --- JSON-LD (use current selling price)
  const ld = productJsonLd({
    url: canonicalFor(`/product/${slug}`),
    name,
    description: stripHtml(shortDescription || "").slice(0, 300),
    image: images.map((i: any) => i.url),
    sku: (isRest ? product.sku : product.sku) || undefined,
    price: displayPrice,
    currency,
    availability: stock as any,
  });

  // --- YMAL (REST only for now)
  let ymalProducts: any[] = [];
  if (isRest) {
    try {
      const catId = (product.categories || [])?.[0]?.id;
      ymalProducts = await listProductsSimple({
        per_page: 8,
        category: catId,
        exclude: Number(product.id),
      });

      if (!ymalProducts || ymalProducts.length < 4) {
        ymalProducts = await listProductsSimple({
          per_page: 8,
          exclude: Number(product.id),
        });
      }
    } catch {
      ymalProducts = [];
    }
  }

  const faqItems = [
    { q: "How long is delivery in the Philippines?", a: "Usually 2–5 business days depending on your location." },
    { q: "Do you accept Cash on Delivery (COD)?", a: "Yes, COD is available in supported areas." },
    { q: "Can I return or exchange?", a: "Yes. If there’s an issue with your item, contact us within 7 days of delivery." },
    { q: "How do I choose the right size?", a: "Check the Size options above. If unsure, message us and we’ll help." },
  ];

  const priceLabel = `₱${displayPrice.toFixed(2)}`;

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
        <div className="space-y-3 min-w-0">
          <div className="w-full max-w-full overflow-x-clip sm:overflow-visible">
            <div className="mx-auto w-full max-w-[92vw] sm:mx-0 sm:max-w-none">
              <ProductGallery images={images} productName={name} />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>

            {/* ✅ price row with compare-at + badge */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-lg font-medium tabular-nums">{priceLabel}</div>

              {pricing.onSale ? (
                <>
                  <div className="text-sm tabular-nums text-[color:var(--color-muted-foreground)] line-through">
                    ₱{pricing.regularPrice.toFixed(2)}
                  </div>
                  <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                    Sale
                  </span>
                </>
              ) : null}
            </div>

            {/* CRO microcopy + trust badges */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={[
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                  stock === "InStock" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800",
                ].join(" ")}
              >
                {stock === "InStock" ? "In stock" : "Out of stock"}
              </span>

              {showOnlyLeft ? (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
                  Only {stockQty} left
                </span>
              ) : null}

              <span className="inline-flex items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-2.5 py-1 text-xs text-[color:var(--color-muted-foreground)]">
                COD available (selected areas)
              </span>

              <span className="inline-flex items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-2.5 py-1 text-xs text-[color:var(--color-muted-foreground)]">
                Ships in 2–5 days (PH)
              </span>

              <span className="inline-flex items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-2.5 py-1 text-xs text-[color:var(--color-muted-foreground)]">
                Secure checkout via WooCommerce
              </span>
            </div>

            {shortDescription ? (
              <div
                className="prose prose-slate max-w-none text-sm text-[color:var(--color-muted-foreground)]"
                dangerouslySetInnerHTML={{ __html: shortDescription }}
              />
            ) : null}
          </div>

          {/* Add to cart */}
          <div id="pdp-atc">
            <AddToCart
              product={{
                productId,
                slug,
                name,
                image: mainImg,
                basePrice: displayPrice,
                currency,
                attributes,
                variations,

                // ✅ keep pill + hard cap qty
                soldIndividually,
                maxPurchaseQty,

                // ✅ NEW: let AddToCart decide disable/cap using stock + backorders
                stockQty: passStockQty,
                stockStatus: passStockStatus,
                backorders: backorders || "no",
              }}
            />
          </div>

          {usps.length ? <UspsCarousel usps={usps} /> : null}

          {description ? (
            <div className="pt-2">
              <div className="text-sm font-semibold">Details</div>
              <div className="prose prose-slate mt-3 max-w-none" dangerouslySetInnerHTML={{ __html: description }} />
            </div>
          ) : null}
        </div>
      </div>

      <section className="mt-12 space-y-10">
        <PdpFaq items={faqItems} />

        {isRest && ymalProducts.length ? (
          <Ymal
            products={ymalProducts.map((p: any) => ({
              id: p.id,
              slug: p.slug,
              name: p.name,
              price: p.price,
              regular_price: p.regular_price,
              sale_price: p.sale_price,
              on_sale: p.on_sale,
              images: (p.images || []).map((i: any) => ({
                src: i?.src,
                alt: i?.alt,
              })),
            }))}
          />
        ) : null}
      </section>

      <StickyAtc name={name} priceLabel={priceLabel} image={mainImg} targetId="pdp-atc" />
    </div>
  );
}