// app/api/checkout/create-order/route.ts
import { NextResponse } from "next/server";
import { createOrder } from "@/lib/woo/rest";
import { auth } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

type IncomingShipping = {
  method_id?: string;        // e.g. "flat_rate"
  rate_id?: string;          // e.g. "flat_rate:2" (optional)
  instance_id?: number;      // optional
  title?: string;            // e.g. "Nationwide"
  total_minor?: string;      // e.g. "8900" (minor units)
  currency_minor_unit?: number; // e.g. 2
  currency_symbol?: string;  // e.g. "₱"
};

function minorToMajorString(minor: any, minorUnit: any) {
  const n = Number(minor ?? 0);
  const unit = Number.isFinite(Number(minorUnit)) ? Number(minorUnit) : 2;
  const denom = Math.pow(10, unit);
  const v = Number.isFinite(n) ? n / denom : 0;
  return v.toFixed(2); // Woo expects "string" major units (e.g. "89.00")
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    const wooCustomerIdRaw = (session?.user as any)?.wooCustomerId;
    const wooCustomerId =
      typeof wooCustomerIdRaw === "number"
        ? wooCustomerIdRaw
        : typeof wooCustomerIdRaw === "string"
        ? Number(wooCustomerIdRaw)
        : null;

    const body = await req.json();

    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Coupons from cart page (optional)
    const coupons: string[] = Array.isArray(body?.coupons) ? body.coupons : [];

    // Shipping selection coming from cart page (optional)
    const shipping: IncomingShipping | null =
      body?.shipping && typeof body.shipping === "object" ? body.shipping : null;

    // If logged-in, prefer session identity. Otherwise allow guest-provided customer info.
    const customerFromBody = body?.customer || null;

    const line_items = items.map((i: any) => ({
      product_id: Number(i.productId),
      variation_id: Number(i.variationId ?? 0) || undefined,
      quantity: Number(i.quantity || 1),
    }));

    const sessionName = session?.user?.name || "";
    const sessionEmail = session?.user?.email || "";

    const customer =
      session?.user
        ? {
            name: sessionName || customerFromBody?.name || "",
            email: sessionEmail || customerFromBody?.email || "",
            phone: customerFromBody?.phone || "",
            address1: customerFromBody?.address1 || "",
            address2: customerFromBody?.address2 || "",
            city: customerFromBody?.city || "",
            state: customerFromBody?.state || "",
            postcode: customerFromBody?.postcode || "",
            country: customerFromBody?.country || "PH",
          }
        : customerFromBody && typeof customerFromBody === "object"
        ? customerFromBody
        : null;

    const billing =
      customer
        ? {
            first_name: String(customer.name || "").split(" ")[0] || "",
            last_name: String(customer.name || "").split(" ").slice(1).join(" ") || "",
            email: String(customer.email || ""),
            phone: String(customer.phone || ""),
            address_1: String(customer.address1 || ""),
            address_2: String(customer.address2 || ""),
            city: String(customer.city || ""),
            state: String(customer.state || ""),
            postcode: String(customer.postcode || ""),
            country: String(customer.country || "PH"),
          }
        : undefined;

    const shippingAddress = billing
      ? {
          first_name: billing.first_name,
          last_name: billing.last_name,
          address_1: billing.address_1,
          address_2: billing.address_2,
          city: billing.city,
          state: billing.state,
          postcode: billing.postcode,
          country: billing.country,
        }
      : undefined;

    // ✅ IMPORTANT: add shipping_lines so Woo checkout shows the shipping fee
    const shipping_lines =
      shipping?.method_id && shipping?.total_minor != null
        ? [
            {
              method_id: String(shipping.method_id), // e.g. "flat_rate"
              method_title: String(shipping.title || shipping.rate_id || "Shipping"),
              total: minorToMajorString(shipping.total_minor, shipping.currency_minor_unit),
            },
          ]
        : [];

    // ✅ Coupons (optional) so Woo calculates discounts properly (if your coupons are valid)
    const coupon_lines = coupons
      .map((code) => String(code || "").trim())
      .filter(Boolean)
      .map((code) => ({ code }));

    const orderPayload: any = {
      line_items,
      ...(billing ? { billing } : {}),
      ...(shippingAddress ? { shipping: shippingAddress } : {}),
      ...(shipping_lines.length ? { shipping_lines } : {}),
      ...(coupon_lines.length ? { coupon_lines } : {}),

      // helpful metadata for debugging
      meta_data: [
        { key: "bisogo_headless", value: "1" },
        { key: "bisogo_source", value: "nextjs" },
        ...(shipping?.rate_id ? [{ key: "bisogo_rate_id", value: String(shipping.rate_id) }] : []),
        ...(shipping?.instance_id != null ? [{ key: "bisogo_instance_id", value: String(shipping.instance_id) }] : []),
      ],

      ...(Number.isFinite(wooCustomerId as any) && (wooCustomerId as number) > 0
        ? { customer_id: wooCustomerId }
        : {}),
    };

    const order = await createOrder(orderPayload);

    const redirectUrl =
      (order as any).payment_url ||
      (order as any).paymentUrl ||
      (order as any).checkoutUrl ||
      `/order/${encodeURIComponent(order.order_key)}?order=${encodeURIComponent(String(order.id))}`;

    return NextResponse.json({
      redirectUrl,
      orderId: order.id,
      orderKey: order.order_key,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to create order" },
      { status: 500 }
    );
  }
}