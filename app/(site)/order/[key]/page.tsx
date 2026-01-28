import Link from "next/link";
import { headers } from "next/headers";
import { ClearCartOnMount } from "@/components/cart/clear-cart-on-mount";

type Props = {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ order?: string }>;
};

type SafeOrder = {
  id: number;
  number: string;
  order_key: string;
  status: string;
  currency: string;
  total: string;
  shipping_total: string;
  discount_total: string;
  total_tax: string;
  date_created: string;
  payment_method_title: string;
  customer_note?: string;
  billing: {
    email: string;
    first_name: string;
    last_name: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items?: { id: number; name: string; quantity: number; total: string }[];
};

type FetchResult =
  | { ok: true; data: SafeOrder }
  | { ok: false; error: string };

function money(v?: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v ?? "";
  return `₱${n.toFixed(2)}`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  // fixed locale to avoid surprises
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(d);
}

function formatAddress(a: {
  first_name?: string; last_name?: string;
  address_1?: string; address_2?: string;
  city?: string; state?: string; postcode?: string;
  country?: string;
}) {
  const lines: string[] = [];
  const name = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim();
  if (name) lines.push(name);
  if (a.address_1) lines.push(a.address_1);
  if (a.address_2) lines.push(a.address_2);
  const cityLine = [a.city, a.state, a.postcode].filter(Boolean).join(", ").replace(", ,", ",");
  if (cityLine) lines.push(cityLine);
  if (a.country) lines.push(a.country);
  return lines;
}

async function getOriginFromHeaders() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;
  return `${proto}://${host}`;
}

async function fetchOrderSafe(orderId: string, key: string): Promise<FetchResult> {
  try {
    const origin = await getOriginFromHeaders();
    if (!origin) return { ok: false, error: "Missing host/origin" };

    const qs = new URLSearchParams({ order: String(orderId), key: String(key) });
    const url = `${origin}/api/woo/order?${qs.toString()}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      return { ok: false, error: j?.error || `Request failed (${res.status})` };
    }

    const data = (await res.json()) as SafeOrder;
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to fetch order" };
  }
}

export default async function OrderReceivedPage({ params, searchParams }: Props) {
  const { key } = await params;
  const sp = await searchParams;
  const orderId = sp.order;

  if (!key || !orderId) {
    return (
      <div className="container py-10">
        <div className="mx-auto max-w-xl rounded-[var(--radius)] border border-[color:var(--color-border)] p-6">
          <div className="text-lg font-semibold">Order not available</div>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
            Missing order information in the URL.
          </p>
          <div className="mt-5 flex gap-3">
            <Link className="underline underline-offset-4" href="/shop">Continue shopping</Link>
            <span className="text-[color:var(--color-muted-foreground)]">·</span>
            <Link className="underline underline-offset-4" href="/blog">Read the blog</Link>
          </div>
        </div>
      </div>
    );
  }

  const result = await fetchOrderSafe(orderId, key);
  if (!result.ok || !result.data || result.data.order_key !== key) {
    return (
      <div className="container py-10">
        <div className="mx-auto max-w-xl rounded-[var(--radius)] border border-[color:var(--color-border)] p-6">
          <div className="text-lg font-semibold">Order not available</div>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
            We couldn’t verify this order link. Please check the URL or try again.
          </p>
          <p className="mt-3 text-xs text-[color:var(--color-muted-foreground)]">
            {result.ok ? "" : result.error}
          </p>
          <div className="mt-5 flex gap-3">
            <Link className="underline underline-offset-4" href="/shop">Continue shopping</Link>
            <span className="text-[color:var(--color-muted-foreground)]">·</span>
            <Link className="underline underline-offset-4" href="/blog">Read the blog</Link>
          </div>
        </div>
      </div>
    );
  }

  const order = result.data;

  const shippingLines = formatAddress(order.shipping);
  const billingLines = formatAddress(order.billing);

  return (
    <div className="container py-10">
      <ClearCartOnMount />

      <h1 className="text-4xl font-semibold tracking-tight">Order received</h1>
      <p className="mt-3 text-sm text-[color:var(--color-muted-foreground)]">
        Thank you. Your order has been received.
      </p>

      {/* Summary row */}
      <div className="mt-10 grid gap-8 md:grid-cols-5">
        <div>
          <div className="text-sm font-semibold">Order number:</div>
          <div className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">{order.number}</div>
        </div>
        <div>
          <div className="text-sm font-semibold">Date:</div>
          <div className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">{formatDate(order.date_created)}</div>
        </div>
        <div>
          <div className="text-sm font-semibold">Total:</div>
          <div className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">{money(order.total)}</div>
        </div>
        <div>
          <div className="text-sm font-semibold">Email:</div>
          <div className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">{order.billing?.email || "—"}</div>
        </div>
        <div>
          <div className="text-sm font-semibold">Payment method:</div>
          <div className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">{order.payment_method_title || "—"}</div>
        </div>
      </div>

      {/* Order details */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Order details</h2>

        <div className="mt-4 overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)]">
          <div className="grid grid-cols-2 bg-[color:var(--color-muted)] px-5 py-3 text-sm font-semibold">
            <div>Product</div>
            <div className="text-right">Total</div>
          </div>

          <div className="divide-y divide-[color:var(--color-border)]">
            {(order.line_items || []).map((i) => (
              <div key={i.id} className="grid grid-cols-2 px-5 py-4 text-sm">
                <div className="underline underline-offset-4">{i.name} × {i.quantity}</div>
                <div className="text-right">{money(i.total)}</div>
              </div>
            ))}

            <div className="grid grid-cols-2 px-5 py-4 text-sm font-semibold">
              <div>Total</div>
              <div className="text-right">{money(order.total)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Addresses */}
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-base font-semibold">Shipping address</h3>
          <div className="mt-3 rounded-[var(--radius)] border border-[color:var(--color-border)] p-5 text-sm text-[color:var(--color-muted-foreground)]">
            {shippingLines.length ? (
              <div className="space-y-1">
                {shippingLines.map((l, idx) => <div key={idx}>{l}</div>)}
              </div>
            ) : (
              <div>—</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold">Billing address</h3>
          <div className="mt-3 rounded-[var(--radius)] border border-[color:var(--color-border)] p-5 text-sm text-[color:var(--color-muted-foreground)]">
            {billingLines.length ? (
              <div className="space-y-1">
                {billingLines.map((l, idx) => <div key={idx}>{l}</div>)}
              </div>
            ) : (
              <div>—</div>
            )}
          </div>
        </div>
      </div>

      {/* Additional info */}
      <div className="mt-8 rounded-[var(--radius)] border border-[color:var(--color-border)] p-5">
        <div className="text-sm font-semibold">Additional Information for your order</div>
        <div className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          {order.customer_note?.trim() ? order.customer_note : "—"}
        </div>
      </div>

      <div className="mt-10 flex gap-3 text-sm">
        <Link className="underline underline-offset-4" href="/shop">Continue shopping</Link>
        <span className="text-[color:var(--color-muted-foreground)]">·</span>
        <Link className="underline underline-offset-4" href="/blog">Read the blog</Link>
      </div>
    </div>
  );
}