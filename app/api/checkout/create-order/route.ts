// app/api/checkout/create-order/route.ts
import { NextResponse } from "next/server";
import { createOrder } from "@/lib/woo/rest";
import { auth } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

type IncomingShipping = {
  method_id?: string;           // e.g. "flat_rate" | "free_shipping"
  rate_id?: string;             // e.g. "flat_rate:2" | "free_shipping:3"
  instance_id?: number;         // optional
  title?: string;               // e.g. "Visayas Delivery"
  total_minor?: string;         // minor units (string) e.g. "4900" or "0"
  currency_minor_unit?: number; // e.g. 2
  currency_symbol?: string;     // e.g. "₱"
};

function minorToMajorString(minor: any, minorUnit: any) {
  const n = Number(minor ?? 0);
  const unit = Number.isFinite(Number(minorUnit)) ? Number(minorUnit) : 2;
  const denom = Math.pow(10, unit);
  const v = Number.isFinite(n) ? n / denom : 0;
  return v.toFixed(2); // Woo expects major unit string
}

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeCountry(v: any) {
  return String(v || "PH").trim().toUpperCase();
}

function splitName(fullName: string) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || "",
    last: parts.slice(1).join(" ") || "",
  };
}

function requiredAddressFieldsOk(customer: any) {
  // This is the minimum you need for shipping rates + proper order creation.
  const required = ["name", "email", "phone", "address1", "city", "state", "postcode", "country"] as const;
  for (const k of required) {
    if (!isNonEmptyString(customer?.[k])) return false;
  }
  // basic email check
  if (!/^\S+@\S+\.\S+$/.test(String(customer.email || ""))) return false;
  return true;
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

    const coupons: string[] = Array.isArray(body?.coupons) ? body.coupons : [];

    // ✅ HARD REQUIRE: shipping must be selected on cart page
    const shipping: IncomingShipping | null =
      body?.shipping && typeof body.shipping === "object" ? body.shipping : null;

    if (!shipping) {
      return NextResponse.json(
        { error: "Please select a shipping method before checkout." },
        { status: 400 }
      );
    }

    // ✅ Validate shipping shape
    if (!isNonEmptyString(shipping.method_id)) {
      return NextResponse.json(
        { error: "Missing shipping method. Please reselect a shipping option." },
        { status: 400 }
      );
    }
    if (!isNonEmptyString(shipping.rate_id)) {
      return NextResponse.json(
        { error: "Missing shipping rate. Please reselect a shipping option." },
        { status: 400 }
      );
    }
    // total_minor must exist (can be "0" for free shipping)
    if (shipping.total_minor == null || String(shipping.total_minor).trim() === "") {
      return NextResponse.json(
        { error: "Missing shipping total. Please reselect a shipping option." },
        { status: 400 }
      );
    }

    // If logged-in, prefer session identity, but still require address fields from body
    const customerFromBody = body?.customer || null;

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

    // ✅ Require address data (guest + logged-in) so gateways + shipping are consistent
    if (!customer || !requiredAddressFieldsOk(customer)) {
      return NextResponse.json(
        { error: "Please complete your shipping address before checkout." },
        { status: 400 }
      );
    }

    const { first, last } = splitName(customer.name);

    const billing = {
      first_name: first,
      last_name: last,
      email: String(customer.email || ""),
      phone: String(customer.phone || ""),
      address_1: String(customer.address1 || ""),
      address_2: String(customer.address2 || ""),
      city: String(customer.city || ""),
      state: String(customer.state || ""),
      postcode: String(customer.postcode || ""),
      country: normalizeCountry(customer.country),
    };

    const shippingAddress = {
      first_name: billing.first_name,
      last_name: billing.last_name,
      address_1: billing.address_1,
      address_2: billing.address_2,
      city: billing.city,
      state: billing.state,
      postcode: billing.postcode,
      country: billing.country,
    };

    const line_items = items.map((i: any) => ({
      product_id: Number(i.productId),
      variation_id: Number(i.variationId ?? 0) || undefined,
      quantity: Number(i.quantity || 1),
    }));

    // ✅ Add shipping_lines ALWAYS (including free shipping with 0.00)
    const shipping_lines = [
      {
        method_id: String(shipping.method_id),
        method_title: String(shipping.title || shipping.rate_id || "Shipping"),
        total: minorToMajorString(shipping.total_minor, shipping.currency_minor_unit),
      },
    ];

    const coupon_lines = coupons
      .map((code) => String(code || "").trim())
      .filter(Boolean)
      .map((code) => ({ code }));

    const orderPayload: any = {
      line_items,
      billing,
      shipping: shippingAddress,
      shipping_lines,
      ...(coupon_lines.length ? { coupon_lines } : {}),

      meta_data: [
        { key: "bisogo_headless", value: "1" },
        { key: "bisogo_source", value: "nextjs" },
        { key: "bisogo_rate_id", value: String(shipping.rate_id) },
        ...(shipping.instance_id != null
          ? [{ key: "bisogo_instance_id", value: String(shipping.instance_id) }]
          : []),
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