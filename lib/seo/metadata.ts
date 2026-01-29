import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/utils";

export function canonicalFor(path: string) {
  return absoluteUrl(path);
}

export function baseMetadata(): Metadata {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const title = "Bisogo";
  const description = "Headless travel blog + eCommerce on WooCommerce, powered by Next.js.";
  return {
    metadataBase: new URL(site),
    title: {
      default: title,
      template: "%s · Bisogo"
    },
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    description,
    alternates: { canonical: site },
    openGraph: {
      type: "website",
      title,
      description,
      url: site
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}
