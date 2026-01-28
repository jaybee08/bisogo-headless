import { NextResponse } from "next/server";
import { createOrder } from "@/lib/woo/rest";
import { auth } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

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

    // If logged-in, prefer session identity. Otherwise allow guest-provided customer info.
    const customerFromBody = body?.customer || null;

    const line_items = items.map((i: any) => ({
      product_id: Number(i.productId),
      variation_id: Number(i.variationId ?? 0) || undefined,
      quantity: Number(i.quantity || 1),
    }));

    // Guest/customer details -> Woo billing/shipping
    // If logged-in, you can still accept address/phone from body (optional),
    // but email/name should come from session when available.
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
        : (customerFromBody && typeof customerFromBody === "object" ? customerFromBody : null);

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

    const shipping = billing
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

    const orderPayload: any = {
      line_items,
      meta_data: [
        { key: "bisogo_headless", value: "1" },
        { key: "bisogo_source", value: "nextjs" },
      ],
      ...(billing ? { billing } : {}),
      ...(shipping ? { shipping } : {}),
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

    return NextResponse.json({ redirectUrl, orderId: order.id, orderKey: order.order_key });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to create order" },
      { status: 500 }
    );
  }
}