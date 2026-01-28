import { z } from "zod";

const OrderResponse = z.object({
  id: z.number(),
  order_key: z.string(),
  payment_url: z.string().optional().nullable(),
});

function basicAuthHeader() {
  const key = process.env.WOO_CONSUMER_KEY;
  const secret = process.env.WOO_CONSUMER_SECRET;
  if (!key || !secret)
    throw new Error("WOO_CONSUMER_KEY and WOO_CONSUMER_SECRET must be set");
  const token = Buffer.from(`${key}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

function restBase() {
  const base = process.env.WOO_REST_URL;
  if (!base) throw new Error("WOO_REST_URL must be set");

  const clean = base.replace(/\/$/, "");
  if (!clean.includes("/wp-json/wc/v3")) {
    throw new Error(`WOO_REST_URL must include /wp-json/wc/v3. Got: ${clean}`);
  }
  return clean;
}

export async function wooFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const url = `${restBase()}${path.startsWith("/") ? "" : "/"}${path}`;

  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? 12_000;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // include url to help debug quickly
      throw new Error(`Woo REST ${res.status} @ ${url}: ${text}`);
    }

    return (await res.json()) as T;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error(`Woo REST timeout after ${timeoutMs}ms @ ${url}`);
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export async function listProducts(opts: {
  page: number;
  per_page: number;
  search?: string;
  category?: number;
  orderby?: string;
  order?: string;
}) {
  const qs = new URLSearchParams({
    page: String(opts.page),
    per_page: String(opts.per_page),
    status: "publish",
  });
  if (opts.search) qs.set("search", opts.search);
  if (opts.category) qs.set("category", String(opts.category));
  if (opts.orderby) qs.set("orderby", opts.orderby);
  if (opts.order) qs.set("order", opts.order);

  return await wooFetch<any[]>(`/products?${qs.toString()}`);
}

export async function listCategories() {
  return await wooFetch<any[]>(
    `/products/categories?per_page=100&hide_empty=true`
  );
}

export async function getProductBySlug(slug: string) {
  const products = await wooFetch<any[]>(
    `/products?slug=${encodeURIComponent(slug)}&status=publish`
  );
  return products?.[0] || null;
}

export async function createOrder(payload: any) {
  const order = await wooFetch<any>(`/orders`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return OrderResponse.parse(order);
}