// lib/seo/jsonld.tsx
import React from "react";

export type JsonLd = Record<string, any>;

type AnyObj = Record<string, any>;

export function clean<T>(input: T): T {
  if (input === null || input === undefined) return input;

  if (Array.isArray(input)) {
    return input.map((x) => clean(x)) as unknown as T;
  }

  if (typeof input !== "object") return input;

  const obj = input as unknown as AnyObj;

  for (const k of Object.keys(obj)) {
    const v = obj[k];

    if (v === undefined || v === null || v === "") {
      delete obj[k];
      continue;
    }

    if (Array.isArray(v)) {
      obj[k] = v.map((x) => clean(x));
      continue;
    }

    if (typeof v === "object") {
      obj[k] = clean(v);
    }
  }

  return input;
}

/**
 * Renders JSON-LD safely in App Router.
 */
export function JsonLd({ data }: { data: JsonLd }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(clean(data)) }}
    />
  );
}

/**
 * Simple WebPage JSON-LD helper used by /p/[slug] and /product/[slug].
 */
export function webpageJsonLd(input: {
  url: string;
  name: string;
  description?: string | null;
  image?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
}): JsonLd {
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: input.url,
    name: input.name,
    description: input.description || undefined,
  };

  if (input.image) data.image = input.image;
  if (input.datePublished) data.datePublished = input.datePublished;
  if (input.dateModified) data.dateModified = input.dateModified;

  return clean(data);
}

/**
 * Product JSON-LD helper used by /product/[slug]
 */
export function productJsonLd(input: {
  url: string;
  name: string;
  description?: string | null;
  image?: string | null;
  currency?: string | null;
  price?: number | string | null;
  sku?: string | null;
  brand?: string | null;
  availability?: "InStock" | "OutOfStock" | "PreOrder" | string | null;
}): JsonLd {
  const priceNum =
    input.price === null || input.price === undefined
      ? null
      : typeof input.price === "number"
      ? input.price
      : Number(String(input.price).replace(/[^0-9.]/g, ""));

  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    url: input.url,
    name: input.name,
    description: input.description || undefined,
    image: input.image ? [input.image] : undefined,
    sku: input.sku || undefined,
    brand: input.brand ? { "@type": "Brand", name: input.brand } : undefined,
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: input.currency || undefined,
      price: Number.isFinite(priceNum as number) ? String(priceNum) : undefined,
      availability: input.availability
        ? `https://schema.org/${input.availability}`
        : undefined,
    },
  };

  return clean(data);
}