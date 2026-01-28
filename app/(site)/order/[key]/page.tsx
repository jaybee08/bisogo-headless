import Link from "next/link";
import { notFound } from "next/navigation";
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
  currency?: string;
  total: string;
  date_created: string;
  payment_method_title?: string;
  line_items?: { id: number; name: string; quantity: number; total: string }[];
};

async function fetchOrderSafe(orderId: string, key: string) {
  try {
    // ✅ Call your safe route (verifies key/email)
    const qs = new URLSearchParams({
      order: String(orderId),
      key: String(key),
    });

    // Relative fetch is fine in App Router server components
    const res = await fetch(`/api/woo/order?${qs.toString()}`, { cache: "no-store" });
    if (!res.ok) return null;

    return (await res.json()) as SafeOrder;
  } catch {
    return null;
  }
}

export default async function OrderReceivedPage({ params, searchParams }: Props) {
  const { key } = await params;
  const sp = await searchParams;
  const orderId = sp.order;

  if (!key || !orderId) return notFound();

  const order = await fetchOrderSafe(orderId, key);
  if (!order) return notFound();

  // Extra safety (your API already enforces this)
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
              <span className="font-medium">Date:</span>{" "}
              {new Date(order.date_created).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Status:</span> {order.status}
            </div>
            <div>
              <span className="font-medium">Total:</span> ₱{order.total}
            </div>
            <div>
              <span className="font-medium">Payment:</span> {order.payment_method_title}
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