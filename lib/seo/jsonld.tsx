import React from "react";

export function JsonLd({ data }: { data: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function articleJsonLd(input: {
  url: string;
  title: string;
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
}) {
  const obj: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: input.url,
    headline: input.title,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
    author: input.authorName ? { "@type": "Person", name: input.authorName } : undefined,
    image: input.image ? [input.image] : undefined
  };
  return clean(obj);
}

export function productJsonLd(input: {
  url: string;
  name: string;
  description?: string;
  image?: string[];
  sku?: string;
  price: number;
  currency: string;
  availability: "InStock" | "OutOfStock";
}) {
  const obj: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    sku: input.sku,
    image: input.image,
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: input.currency,
      price: input.price,
      availability: `https://schema.org/${input.availability}`
    }
  };
  return clean(obj);
}

function clean<T extends Record<string, any>>(obj: T): T {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined || v === null || v === "") delete obj[k];
    else if (typeof v === "object" && !Array.isArray(v)) obj[k] = clean(v);
  }
  return obj;
}

export function webpageJsonLd(input: {
  url: string;
  name: string;
  description?: string;
}) {
  const { url, name, description } = input;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    url,
    name,
    description: description || undefined,
  };
}