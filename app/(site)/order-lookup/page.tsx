"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SafeOrder = {
  id: number;
  number: string;
  order_key: string;
  status: string;
  total: string;
  date_created: string;
  payment_method_title: string;
  line_items: { id: number; name: string; quantity: number; total: string }[];
  billing?: { email?: string; first_name?: string; last_name?: string };
};

export default function OrderLookupPage() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [order, setOrder] = useState<SafeOrder | null>(null);

  async function onLookup() {
    setErr(null);
    setOrder(null);

    const id = orderId.trim();
    if (!id) return setErr("Please enter your Order ID.");
    if (!email.trim() && !key.trim()) return setErr("Enter either billing email or order key.");

    setLoading(true);
    try {
      const qs = new URLSearchParams({ order: id });
      if (email.trim()) qs.set("email", email.trim());
      if (key.trim()) qs.set("key", key.trim());

      const res = await fetch(`/api/woo/order?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || data?.message || "Order not found");
      setOrder(data as SafeOrder);
    } catch (e: any) {
      setErr(e?.message || "Order not found");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Track your order</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          Enter your order ID and the billing email used at checkout (or order key).
        </p>

        <div className="mt-6 rounded-[var(--radius)] border border-[color:var(--color-border)] p-6 space-y-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Order ID</label>
            <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="e.g. 97" />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Billing email (recommended)</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Order key (optional)</label>
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="wc_order_..." />
          </div>

          {err ? (
            <div className="rounded-[calc(var(--radius)-4px)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <Button className="w-full" onClick={onLookup} disabled={loading}>
            {loading ? "Checking…" : "Find my order"}
          </Button>
        </div>

        {order ? (
          <div className="mt-6 rounded-[var(--radius)] border border-[color:var(--color-border)] p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Order #{order.number}</div>
              <div className="text-sm text-[color:var(--color-muted-foreground)]">{order.status}</div>
            </div>

            <div className="mt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--color-muted-foreground)]">Total</span>
                <span className="font-medium">₱{order.total}</span>
              </div>
            </div>

            <div className="mt-5 border-t border-[color:var(--color-border)] pt-4">
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
              <Link
                className="underline underline-offset-4"
                href={`/order/${encodeURIComponent(order.order_key)}?order=${encodeURIComponent(String(order.id))}`}
              >
                View receipt page
              </Link>
              <span className="text-[color:var(--color-muted-foreground)]">·</span>
              <Link className="underline underline-offset-4" href="/shop">
                Continue shopping
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}