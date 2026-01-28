import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { ClearCartOnMount } from "@/components/cart/clear-cart-on-mount";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ order?: string }>;
};

type SafeOrder = {
  id: number;
  number: string;
  order_key: string;
  status: string;
  currency?: string;
  total: string;
  date_created: string;
  payment_method_title?: string;
  line_items?: { id: number; name: string; quantity: number; total: string }[];
};

async function getOriginFromHeaders() {
  const h = await headers(); // ✅ await (your version returns a Promise)
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;
  return `${proto}://${host}`;
}

// Stable server-side date formatting (prevents SSR mismatch)
function formatDate(dateStr: string) {
  // Woo date usually like "2026-01-28T01:23:45"
  // Show YYYY-MM-DD safely:
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

async function fetchOrderSafe(orderId: string, key: string) {
  const origin = getOriginFromHeaders();
  if (!origin) return { ok: false as const, status: 500, data: null };

  const qs = new URLSearchParams({
    order: String(orderId),
    key: String(key),
  });

  const url = `${origin}/api/woo/order?${qs.toString()}`;

  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data: data as SafeOrder | null };
}

export default async function OrderReceivedPage({ params, searchParams }: Props) {
  const { key } = await params;
  const sp = await searchParams;
  const orderId = sp.order;

  if (!key || !orderId) return notFound();

  // Optional: normalize common Woo redirect to your route if it ever happens
  // e.g. /order-received/<id>/?key=...
  // (ignore if you don't need it)
  // if (sp?.order && key) redirect(`/order/${encodeURIComponent(key)}?order=${encodeURIComponent(sp.order)}`);

  const result = await fetchOrderSafe(orderId, key);

  // Friendly state instead of hard 404 (you can switch back to notFound if you prefer)
  if (!result.ok || !result.data) {
    return (
      <div className="container py-10">
        <div className="mx-auto max-w-xl rounded-[var(--radius)] border border-[color:var(--color-border)] p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Order not available</h1>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
            We couldn’t verify this order link. Please check the URL or try again.
          </p>
          <div className="mt-6 flex gap-3">
            <Link className="underline underline-offset-4" href="/shop">
              Continue shopping
            </Link>
            <span className="text-[color:var(--color-muted-foreground)]">·</span>
            <Link className="underline underline-offset-4" href="/blog">
              Read the blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const order = result.data;

  // Extra safety (API already enforces this)
  if (order.order_key !== key) return notFound();

  return (
    <div className="container py-10">
      <ClearCartOnMount />

      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Order received</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          Thank you. Your order has been received.
        </p>

        <div className="mt-6 rounded-[var(--radius)] border border-[color:var(--color-border)] p-6">
          <div className="grid gap-2 text-sm">
            <div>
              <span className="font-medium">Order #:</span> {order.number}
            </div>
            <div>
              <span className="font-medium">Date:</span> {formatDate(order.date_created)}
            </div>
            <div>
              <span className="font-medium">Status:</span> {order.status}
            </div>
            <div>
              <span className="font-medium">Total:</span> ₱{order.total}
            </div>
            <div>
              <span className="font-medium">Payment:</span> {order.payment_method_title || "—"}
            </div>
          </div>

          <div className="mt-6 border-t border-[color:var(--color-border)] pt-5">
            <div className="text-sm font-semibold">Items</div>
            <ul className="mt-3 space-y-2 text-sm">
              {order.line_items?.map((i) => (
                <li key={i.id} className="flex justify-between gap-4">
                  <span>
                    {i.name} × {i.quantity}
                  </span>
                  <span>₱{i.total}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex gap-3">
            <Link className="underline underline-offset-4" href="/shop">
              Continue shopping
            </Link>
            <span className="text-[color:var(--color-muted-foreground)]">·</span>
            <Link className="underline underline-offset-4" href="/blog">
              Read the blog
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}