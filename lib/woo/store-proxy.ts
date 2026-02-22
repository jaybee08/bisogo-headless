// lib/woo/store-proxy.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function cmsOrigin() {
  const o = process.env.CMS_ORIGIN || process.env.WOO_SITE_ORIGIN || process.env.WOO_SITE_URL;
  if (!o) throw new Error("CMS_ORIGIN is not set");
  return o.replace(/\/$/, "");
}

/**
 * Forward to Woo Store API (wc/store/v1) using Cart-Token.
 * The Cart-Token is stored client-side (localStorage) and sent as header.
 */
export async function storeProxy(req: NextRequest, path: string, init?: RequestInit) {
  const upstream = `${cmsOrigin()}/wp-json/wc/store/v1${path.startsWith("/") ? "" : "/"}${path}`;

  const cartToken = req.headers.get("x-cart-token") || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(cartToken ? { "Cart-Token": cartToken } : {}),
  };

  // pass through method/body
  const res = await fetch(upstream, {
    method: init?.method || req.method,
    body: init?.body,
    headers,
    cache: "no-store",
  });

  // pull Cart-Token from upstream response (Woo sends it)
  const nextToken =
    res.headers.get("Cart-Token") ||
    res.headers.get("cart-token") ||
    "";

  const text = await res.text();
  const out = new NextResponse(text, { status: res.status });

  if (nextToken) out.headers.set("x-cart-token", nextToken);
  out.headers.set("Content-Type", res.headers.get("content-type") || "application/json");

  return out;
}