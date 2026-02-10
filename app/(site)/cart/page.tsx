"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/store";
import { CartLine } from "@/components/cart/cart-line";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/state/empty";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { Lock } from "lucide-react";

type CheckoutResponse = { redirectUrl: string };

type Guest = {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string; // "PH"
};

export default function CartPage() {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const hasHydrated = useCart((s) => s.hasHydrated);
  const clear = useCart((s) => s.clear);

  const { data } = useSession();
  const isAuthed = !!data?.user;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [guest, setGuest] = useState<Guest>({
    name: data?.user?.name || "",
    email: data?.user?.email || "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postcode: "",
    country: "PH",
  });

  function set<K extends keyof Guest>(k: K, v: Guest[K]) {
    setGuest((p) => ({ ...p, [k]: v }));
  }

  const payload = useMemo(() => {
    return {
      items: items.map((i) => ({
        productId: i.productId,
        variationId: i.variationId,
        slug: i.slug,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        attributes: i.attributes,
      })),
      customer: isAuthed
        ? { name: data?.user?.name, email: data?.user?.email }
        : { ...guest },
    };
  }, [items, isAuthed, data?.user, guest]);

  function validateGuest() {
    if (isAuthed) return null;

    const req: Array<keyof Guest> = [
      "name",
      "email",
      "phone",
      "address1",
      "city",
      "state",
      "postcode",
      "country",
    ];
    for (const k of req) {
      if (!String(guest[k] || "").trim()) return `Please fill in ${k}.`;
    }
    if (!/^\S+@\S+\.\S+$/.test(guest.email)) return "Please enter a valid email.";
    return null;
  }

  const onCheckout = async () => {
    if (!items.length || loading) return;

    const guestErr = validateGuest();
    if (guestErr) {
      setError(guestErr);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let dataJson: any = null;
      try {
        dataJson = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok)
        throw new Error(
          (dataJson && (dataJson.error || dataJson.message)) || text || "Checkout failed"
        );

      const data = (dataJson || {}) as CheckoutResponse;
      if (!data.redirectUrl) throw new Error("Missing redirectUrl from server.");

      window.location.href = data.redirectUrl;
    } catch (e: any) {
      setError(e?.message || "Checkout failed");
      setLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
            Your items are stored locally on this device.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_360px]">
        <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] divide-y divide-[color:var(--color-border)]">
          {items.length ? (
            items.map((item) => <CartLine key={item.key} item={item} />)
          ) : (
            <div className="p-6">
              <EmptyState title="Your cart is empty" description="Add products from the shop to begin." />
            </div>
          )}
        </div>

        <aside className="h-fit rounded-[var(--radius)] border border-[color:var(--color-border)] p-5">
          <div className="text-sm font-semibold">Order summary</div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[color:var(--color-muted-foreground)]">Subtotal</span>
            <span className="font-medium">₱{(hasHydrated ? subtotal : 0).toFixed(2)}</span>
          </div>
          <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
            Taxes and shipping are calculated during checkout.
          </div>

          {!isAuthed ? (
            <div className="mt-5 space-y-3">
              <div className="text-sm font-semibold">Guest details</div>

              <Input placeholder="Full name" value={guest.name} onChange={(e) => set("name", e.target.value)} />
              <Input placeholder="Email" value={guest.email} onChange={(e) => set("email", e.target.value)} />
              <Input placeholder="Phone" value={guest.phone} onChange={(e) => set("phone", e.target.value)} />

              <Input
                placeholder="Address line 1"
                value={guest.address1}
                onChange={(e) => set("address1", e.target.value)}
              />
              <Input
                placeholder="Address line 2 (optional)"
                value={guest.address2}
                onChange={(e) => set("address2", e.target.value)}
              />

              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="City" value={guest.city} onChange={(e) => set("city", e.target.value)} />
                <Input
                  placeholder="State/Province"
                  value={guest.state}
                  onChange={(e) => set("state", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Postal code"
                  value={guest.postcode}
                  onChange={(e) => set("postcode", e.target.value)}
                />
                <Input placeholder="Country (PH)" value={guest.country} onChange={(e) => set("country", e.target.value)} />
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-[calc(var(--radius)-4px)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-5 space-y-2">
            <Button className="w-full" onClick={onCheckout} disabled={!items.length || loading}>
              {loading ? "Creating order…" : "Checkout"}
            </Button>

            <Button className="w-full" variant="outline" onClick={clear} disabled={!items.length || loading}>
              Clear cart
            </Button>
          </div>

          {/* Trust + redirect note (non-technical, low friction) */}
          <div className="mt-5 space-y-2 text-sm text-[color:var(--color-muted-foreground)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-white/60 px-3 py-1">
              <Lock className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium text-foreground/80">Secure checkout by Bisogo</span>
            </div>

            <p className="text-xs">
              After you click Checkout, you’ll be redirected to our secure checkout to finalize payment.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}