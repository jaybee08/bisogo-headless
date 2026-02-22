// app/api/store/cart/sync/route.ts
import { NextRequest } from "next/server";
import { storeProxy } from "@/lib/woo/store-proxy";

export const runtime = "nodejs";

type SyncBody = {
  items: Array<{ productId: number; variationId?: number; quantity: number }>;
};

type StoreCartItem = {
  key: string;
  id: number; // product or variation id depending on cart line
  quantity: number;
  variation?: Array<{ attribute: string; value: string }>;
};

function desiredId(i: { productId: number; variationId?: number }) {
  // For variations, Store API cart line id is usually the VARIATION id
  // For simple, it's the PRODUCT id
  return Number(i.variationId ?? i.productId);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as SyncBody | null;
  const desired = Array.isArray(body?.items) ? body!.items : [];

  // 1) Get current cart
  const cartRes = await storeProxy(req, "/cart", { method: "GET" });
  const cartToken = cartRes.headers.get("x-cart-token") || req.headers.get("x-cart-token") || "";
  const cartJson = (await cartRes.json().catch(() => null)) as any;

  const existing: StoreCartItem[] = Array.isArray(cartJson?.items) ? cartJson.items : [];

  // Helper to keep Cart-Token across internal proxy calls
  const mkReq = (method: string, path: string, json?: any) => {
    const headers = new Headers();
    if (cartToken) headers.set("x-cart-token", cartToken);

    return storeProxy(
      new NextRequest(req.url, { method, headers }),
      path,
      json ? { method, body: JSON.stringify(json) } : { method }
    );
  };

  // Build lookup of desired items by id
  const desiredById = new Map<number, number>(); // id -> qty
  for (const i of desired) {
    const id = desiredId(i);
    const qty = Math.max(1, Number(i.quantity || 1));
    if (!Number.isFinite(id) || id <= 0) continue;
    desiredById.set(id, qty);
  }

  // 2) Update or remove existing items
  for (const li of existing) {
    if (!li?.key) continue;

    const id = Number(li.id);
    const wantQty = desiredById.get(id);

    if (!wantQty) {
      // Not in local cart anymore -> remove
      await mkReq("POST", "/cart/remove-item", { key: li.key });
      continue;
    }

    // Exists in both -> update quantity if different
    if (Number(li.quantity) !== wantQty) {
      await mkReq("POST", "/cart/update-item", { key: li.key, quantity: wantQty });
    }

    // Mark as processed so we don't add again
    desiredById.delete(id);
  }

  // 3) Add missing items
  for (const [id, qty] of desiredById.entries()) {
    await mkReq("POST", "/cart/add-item", { id, quantity: qty });
  }

  // 4) Return fresh cart (with correct totals)
  return await mkReq("GET", "/cart");
}