import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/providers";
import { baseMetadata } from "@/lib/seo/metadata";
import { CartToastStack } from "@/components/cart/cart-toast";
import { GoogleAnalytics } from '@next/third-parties/google'


const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = baseMetadata();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <GoogleAnalytics gaId="G-P9ECKCL0BF" />
          <CartToastStack />
        </Providers>
      </body>
    </html>
  );
}