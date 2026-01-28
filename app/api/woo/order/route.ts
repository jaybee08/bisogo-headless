// app/api/woo/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { wooFetch } from "@/lib/woo/rest";

export const runtime = "nodejs";

function sanitizeOrder(order: any) {
  // Only return what you need for the receipt UI
  return {
    id: order?.id,
    number: order?.number,
    order_key: order?.order_key,
    status: order?.status,
    currency: order?.currency,
    total: order?.total,
    date_created: order?.date_created,
    payment_method_title: order?.payment_method_title,
    billing: {
      email: order?.billing?.email,
      first_name: order?.billing?.first_name,
      last_name: order?.billing?.last_name,
    },
    line_items: Array.isArray(order?.line_items)
      ? order.line_items.map((i: any) => ({
          id: i?.id,
          name: i?.name,
          quantity: i?.quantity,
          total: i?.total,
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