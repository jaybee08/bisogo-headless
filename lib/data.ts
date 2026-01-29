import {
  POSTS_INDEX_QUERY,
  POST_BY_SLUG_QUERY,
  RELATED_POSTS_QUERY,
} from "@/lib/graphql/queries/posts";
import {
  PAGE_BY_SLUG_QUERY,
  PAGE_BY_URI_QUERY,
} from "@/lib/graphql/queries/pages";
import {
  PRODUCTS_INDEX_WOO_GQL,
  PRODUCT_BY_SLUG_WOO_GQL,
} from "@/lib/graphql/queries/products";
import {
  getProductBySlug,
  listCategories,
  listProducts,
} from "@/lib/woo/rest";
import { gqlSafeRequest, gqlClient } from "@/lib/graphql/client";

let wooGraphQLAvailable: boolean | null = null;

function errMsg(e: any) {
  return (
    e?.response?.errors?.[0]?.message ||
    e?.message ||
    "Upstream request failed"
  );
}

/**
 * ✅ Never throws. If WPGraphQL WooCommerce is down, returns false.
 */
export async function isWooGraphQLAvailable() {
  if (wooGraphQLAvailable !== null) return wooGraphQLAvailable;

  try {
    // Use strict client but catch errors
    const client = gqlClient({ revalidate: 1800, tags: ["products"] });
    await client.request(PRODUCTS_INDEX_WOO_GQL, {
      first: 1,
      after: null,
      search: null,
      category: null,
    });
    wooGraphQLAvailable = true;
  } catch {
    wooGraphQLAvailable = false;
  }

  return wooGraphQLAvailable;
}

export async function fetchPostsIndex(opts: {
  first: number;
  after?: string | null;
  search?: string | null;
  category?: string | null;
  tag?: string | null;
}) {
  const r = await gqlSafeRequest<any>(
    POSTS_INDEX_QUERY,
    {
      first: opts.first,
      after: opts.after || null,
      search: opts.search || null,
      category: opts.category || null,
      tag: opts.tag || null,
    },
    { revalidate: 600, tags: ["posts"], timeoutMs: 8000 }
  );

  if (!r.ok) {
    return {
      __error: r.error,
      posts: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
      categories: { nodes: [] },
      tags: { nodes: [] },
    };
  }

  return r.data;
}

export async function fetchPostBySlug(slug: string) {
  const clean = String(slug || "").trim();
  if (!clean) return { __error: "Missing slug", post: null };

  const r = await gqlSafeRequest<any>(
    POST_BY_SLUG_QUERY,
    { slug: clean },
    { revalidate: 600, tags: ["posts"], timeoutMs: 8000 }
  );

  if (!r.ok) return { __error: r.error, post: null };

  return r.data;
}

export async function fetchRelatedPosts(notInId: string) {
  const clean = String(notInId || "").trim();
  if (!clean) return { __error: "Missing notInId", posts: { nodes: [] } };

  const r = await gqlSafeRequest<any>(
    RELATED_POSTS_QUERY,
    { notIn: [clean] },
    { revalidate: 600, tags: ["posts"], timeoutMs: 8000 }
  );

  if (!r.ok) return { __error: r.error, posts: { nodes: [] } };

  return r.data;
}

/**
 * ✅ Page fetch (URI based)
 * - Always returns { page, __error? }
 * - Never throws
 */
export async function fetchPageBySlug(slug: string) {
  const clean = String(slug || "").trim();
  if (!clean) return { __error: "Missing slug", page: null };

  // Force WPGraphQL URI format: "/about/"
  const uri = clean.startsWith("/") ? clean : `/${clean}`;
  const uriWithSlash = uri.endsWith("/") ? uri : `${uri}/`;

  const r = await gqlSafeRequest<any>(
    PAGE_BY_SLUG_QUERY,
    { slug: uriWithSlash },
    { revalidate: 600, tags: ["pages"], timeoutMs: 8000 }
  );

  if (r.ok) return r.data;

  const r2 = await gqlSafeRequest<any>(
    PAGE_BY_URI_QUERY,
    { uri: uriWithSlash },
    { revalidate: 600, tags: ["pages"], timeoutMs: 8000 }
  );

  if (r2.ok) return r2.data;

  return { __error: r2.error || r.error, page: null };
}

export function normalizePrice(input: any): { raw: number; formatted: string } {
  if (typeof input === "number") return { raw: input, formatted: input.toFixed(2) };
  const str = String(input || "");
  const num = Number(str.replace(/<[^>]+>/g, "").replace(/[^0-9.]/g, ""));
  const raw = Number.isFinite(num) ? num : 0;
  return { raw, formatted: raw.toFixed(2) };
}

export async function fetchProductsIndex(opts: {
  first: number;
  page: number;
  search?: string | null;
  categorySlug?: string | null;
  sort?: string;
}) {
  const useGql = await isWooGraphQLAvailable();

  if (useGql) {
    const r = await gqlSafeRequest<any>(
      PRODUCTS_INDEX_WOO_GQL,
      {
        first: opts.first,
        after: null,
        search: opts.search || null,
        category: opts.categorySlug || null,
      },
      { revalidate: 600, tags: ["products"], timeoutMs: 8000 }
    );

    if (!r.ok) {
      wooGraphQLAvailable = false;
    } else {
      const data = r.data;
      const nodes = data?.products?.nodes ?? [];
      const sort = opts.sort || "latest";

      if (sort === "price-asc")
        nodes.sort(
          (a: any, b: any) =>
            normalizePrice(a.price).raw - normalizePrice(b.price).raw
        );
      if (sort === "price-desc")
        nodes.sort(
          (a: any, b: any) =>
            normalizePrice(b.price).raw - normalizePrice(a.price).raw
        );

      if (data?.products) data.products.nodes = nodes;
      return data;
    }
  }

  // ✅ REST fallback (also safe)
  try {
    const categories = await listCategories();

    const catId = opts.categorySlug
      ? categories.find((c: any) => c.slug === opts.categorySlug)?.id
      : undefined;

    const orderParams = (() => {
      const sort = opts.sort || "latest";
      if (sort === "price-asc") return { orderby: "price", order: "asc" };
      if (sort === "price-desc") return { orderby: "price", order: "desc" };
      return { orderby: "date", order: "desc" };
    })();

    const products = await listProducts({
      page: opts.page,
      per_page: opts.first,
      search: opts.search || undefined,
      category: catId,
      ...orderParams,
    });

    return { __rest: true as const, products, categories };
  } catch (e: any) {
    return {
      __rest: true as const,
      __error: errMsg(e),
      products: [],
      categories: [],
    };
  }
}

/** --------------------------
 *  ✅ Product USPs helpers
 *  -------------------------- */

type ProductUSP = { title: string; text: string };

/**
 * Handles both REST meta_data (array of { key, value })
 * and common GQL shapes like:
 * - metaData: [{ key, value }]
 * - metaData: { nodes: [{ key, value }] }
 * - metaData: { edges: [{ node: { key, value } }] }
 */
function extractMetaArray(anyProduct: any): Array<{ key: string; value: any }> {
  const md =
    anyProduct?.meta_data ??
    anyProduct?.metaData ??
    anyProduct?.meta_data?.nodes ??
    anyProduct?.metaData?.nodes ??
    null;

  if (Array.isArray(md)) return md as any;

  const edges = anyProduct?.metaData?.edges;
  if (Array.isArray(edges)) {
    return edges
      .map((e: any) => e?.node)
      .filter(Boolean) as Array<{ key: string; value: any }>;
  }

  return [];
}

function parseProductUsps(meta_data?: Array<{ key: string; value: any }>): ProductUSP[] {
  const raw = meta_data?.find((m) => m.key === "_product_usps")?.value;
  if (!raw) return [];

  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => ({
        title: String(x?.title ?? "").trim(),
        text: String(x?.text ?? "").trim(),
      }))
      .filter((x) => x.title || x.text)
      .slice(0, 3);
  } catch {
    return [];
  }
}

function attachUsps(product: any) {
  if (!product) return product;
  const meta = extractMetaArray(product);
  const usps = parseProductUsps(meta);
  // attach without breaking existing usage
  return { ...product, usps };
}

export async function fetchProductBySlug(slug: string) {
  const clean = String(slug || "").trim();
  if (!clean) return { __error: "Missing slug", product: null };

  const useGql = await isWooGraphQLAvailable();

  if (useGql) {
    const r = await gqlSafeRequest<any>(
      PRODUCT_BY_SLUG_WOO_GQL,
      { slug: clean },
      { revalidate: 600, tags: ["products"], timeoutMs: 8000 }
    );

    if (r.ok) {
      // We try to attach `usps` onto the returned product node (common shapes)
      const data = r.data;

      // common: data.product
      if (data?.product) {
        data.product = attachUsps(data.product);
      }

      // fallback: data.products.nodes[0]
      if (data?.products?.nodes?.[0]) {
        data.products.nodes[0] = attachUsps(data.products.nodes[0]);
      }

      return data;
    }

    // degrade to REST if gql fails
    wooGraphQLAvailable = false;
  }

  try {
    const product = await getProductBySlug(clean);
    const patched = attachUsps(product);

    return {
      __rest: true as const,
      product: patched,
      __error: patched ? undefined : "Product not found",
    };
  } catch (e: any) {
    return { __rest: true as const, product: null, __error: errMsg(e) };
  }
}