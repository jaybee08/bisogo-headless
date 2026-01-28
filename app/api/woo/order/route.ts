// app/api/woo/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { wooFetch } from "@/lib/woo/rest";

export const runtime = "nodejs";

function sanitizeOrder(order: any) {
  return {
    id: order?.id,
    number: String(order?.number ?? ""),
    order_key: String(order?.order_key ?? ""),
    status: String(order?.status ?? ""),
    currency: String(order?.currency ?? ""),
    date_created: String(order?.date_created ?? ""),
    payment_method_title: String(order?.payment_method_title ?? ""),

    // totals (strings from Woo)
    total: String(order?.total ?? ""),
    shipping_total: String(order?.shipping_total ?? ""),
    discount_total: String(order?.discount_total ?? ""),
    total_tax: String(order?.total_tax ?? ""),

    // email + addresses
    billing: {
      email: String(order?.billing?.email ?? ""),
      first_name: String(order?.billing?.first_name ?? ""),
      last_name: String(order?.billing?.last_name ?? ""),
      address_1: String(order?.billing?.address_1 ?? ""),
      address_2: String(order?.billing?.address_2 ?? ""),
      city: String(order?.billing?.city ?? ""),
      state: String(order?.billing?.state ?? ""),
      postcode: String(order?.billing?.postcode ?? ""),
      country: String(order?.billing?.country ?? ""),
    },
    shipping: {
      first_name: String(order?.shipping?.first_name ?? ""),
      last_name: String(order?.shipping?.last_name ?? ""),
      address_1: String(order?.shipping?.address_1 ?? ""),
      address_2: String(order?.shipping?.address_2 ?? ""),
      city: String(order?.shipping?.city ?? ""),
      state: String(order?.shipping?.state ?? ""),
      postcode: String(order?.shipping?.postcode ?? ""),
      country: String(order?.shipping?.country ?? ""),
    },

    customer_note: String(order?.customer_note ?? ""),

    line_items: Array.isArray(order?.line_items)
      ? order.line_items.map((i: any) => ({
          id: Number(i?.id ?? 0),
          name: String(i?.name ?? ""),
          quantity: Number(i?.quantity ?? 0),
          total: String(i?.total ?? ""),
        }))
      : [],
  };
}

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order");
  const key = req.nextUrl.searchParams.get("key");
  const email = req.nextUrl.searchParams.get("email");

  if (!orderId) {
    return NextResponse.json({ error: "Missing ?order=" }, { status: 400 });
  }

  // ✅ IMPORTANT: require at least key or email to avoid leaking orders by ID
  if (!key && !email) {
    return NextResponse.json(
      { error: "Missing verification. Provide ?key= or ?email=" },
      { status: 400 }
    );
  }

  try {
    const order = await wooFetch<any>(`/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
      timeoutMs: 12_000,
    });

    // Verify by order_key OR billing email
    if (key && String(order?.order_key) !== String(key)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (email) {
      const billingEmail = String(order?.billing?.email || "").trim().toLowerCase();
      const inputEmail = String(email).trim().toLowerCase();
      if (!billingEmail || billingEmail !== inputEmail) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    return NextResponse.json(sanitizeOrder(order), { status: 200 });
  } catch (e: any) {
    const msg = e?.message || "Woo request failed";

    // Your wooFetch error looks like: "Woo REST 500 @ https://...: body"
    const m = msg.match(/Woo REST (\d+)\s*@/);
    const upstreamStatus = m ? Number(m[1]) : 502;

    return NextResponse.json(
      { error: "Woo request failed", upstreamStatus, message: msg },
      { status: 502 }
    );
  }
}