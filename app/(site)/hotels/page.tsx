// app/(site)/hotels/page.tsx
import Script from "next/script";
import type { Metadata } from "next";
import { AGODA_CITIES } from "@/app/api/agoda/cities";
import HotelsClient from "./ui/hotels-client";

function siteUrl() {
  const u = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return u.replace(/\/$/, "");
}

export const metadata: Metadata = {
  title: "Book Hotels | Bisogo",
  description: "Search hotel deals and book via Agoda.",
  alternates: {
    canonical: `${siteUrl()}/hotels`,
  },
  openGraph: {
    title: "Book Hotels | Bisogo",
    description: "Search hotel deals and book via Agoda.",
    url: `${siteUrl()}/hotels`,
    type: "website",
  },
};

export default function HotelsPage() {
  const base = siteUrl();

  // ✅ BreadcrumbList
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: "Hotels", item: `${base}/hotels` },
    ],
  };

  // ✅ WebSite + SearchAction (Google can show your site search)
  // IMPORTANT: target must be a real URL pattern.
  // We’ll use query params that your page understands (even if it’s client-driven).
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Bisogo",
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: `${base}/hotels?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="container py-8">
      <Script
        id="jsonld-hotels-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Script
        id="jsonld-website-searchaction"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />

      <h1 className="text-2xl font-semibold">Book Hotels</h1>
      <p className="mt-2 text-sm text-neutral-600">Search hotel deals and book via Agoda.</p>

      <HotelsClient cities={AGODA_CITIES} />
    </div>
  );
}