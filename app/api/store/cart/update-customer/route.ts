import { NextRequest, NextResponse } from "next/server";
import { storeProxy } from "@/lib/woo/store-proxy";

export const runtime = "nodejs";

function normalizeCountry(input: any) {
  const s = String(input ?? "").trim();
  if (!s) return "PH";
  const up = s.toUpperCase();

  // Accept common user autofill strings
  if (up === "PH" || up === "PHL" || up === "PHILIPPINES") return "PH";
  if (s.toLowerCase() === "philippines") return "PH";

  // Otherwise keep as ISO-ish
  return up;
}

function cleanAddr(addr: any) {
  const a = addr && typeof addr === "object" ? addr : {};

  // Ensure required keys exist (Woo Store API is picky)
  const out = {
    first_name: String(a.first_name ?? "").trim(),
    last_name: String(a.last_name ?? "").trim(),
    company: String(a.company ?? "").trim(),
    address_1: String(a.address_1 ?? "").trim(),
    address_2: String(a.address_2 ?? "").trim(),
    city: String(a.city ?? "").trim(),
    state: String(a.state ?? "").trim(),
    postcode: String(a.postcode ?? "").trim(),
    country: normalizeCountry(a.country),
    email: a.email != null ? String(a.email).trim() : undefined,
    phone: a.phone != null ? String(a.phone).trim() : undefined,
  };

  // Remove undefined so we don’t send junk
  Object.keys(out).forEach((k) => {
    // @ts-ignore
    if (out[k] === undefined) delete out[k];
  });

  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as any;

    // Accept either:
    // - { billing_address: {...}, shipping_address: {...} }  (what your cart page sends now)
    // - { billing: {...}, shipping: {...} }                  (common alt)
    const billingRaw = body?.billing_address ?? body?.billing ?? null;
    const shippingRaw = body?.shipping_address ?? body?.shipping ?? null;

    if (!billingRaw && !shippingRaw) {
      return NextResponse.json(
        { error: "Missing billing/shipping address payload." },
        { status: 400 }
      );
    }

    const payload: any = {};
    if (billingRaw) payload.billing_address = cleanAddr(billingRaw);
    if (shippingRaw) payload.shipping_address = cleanAddr(shippingRaw);

    // Forward to Woo Store API cart update customer endpoint
    const res = await storeProxy(req, "/cart/update-customer", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: res.headers,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to update customer" },
      { status: 500 }
    );
  }
}