"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem, type CartTotals } from "@/lib/cart/store";

type StoreCartResponse = {
  items?: Array<{ key: string; id: number }>;
  totals?: {
    total_items: string;
    total_discount: string;
    total_shipping: string;
    total_price: string;
    currency_code: string;
    currency_symbol: string;
    currency_minor_unit: number;
  };
};

type QtyLimits = { min: number; max: number; step: number; editable: boolean };

function readCartToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("bisogo_cart_token") || "";
}
function writeCartToken(token: string) {
  if (typeof window === "undefined") return;
  if (!token) return;
  localStorage.setItem("bisogo_cart_token", token);
}

function minorToNumber(minorStr: string | undefined, minorUnit: number) {
  const n = Number(minorStr || "0");
  const denom = Math.pow(10, minorUnit || 2);
  return Number.isFinite(n) ? n / denom : 0;
}

function storeTotalsToCartTotals(totals: StoreCartResponse["totals"] | undefined): CartTotals | null {
  if (!totals) return null;
  const minor = totals.currency_minor_unit ?? 2;

  return {
    currency: totals.currency_code || "PHP",
    subtotal: minorToNumber(totals.total_items, minor),
    shipping: minorToNumber(totals.total_shipping, minor),
    discount: minorToNumber(totals.total_discount, minor),
    total: minorToNumber(totals.total_price, minor),
  };
}

export function CartLine({
  item,
  limits,
}: {
  item: CartItem;
  limits?: QtyLimits;
}) {
  // fast local update (no totals flicker)
  const setQtyFast = useCart((s) => s.setQuantityFast);
  const removeLocal = useCart((s) => s.removeItem);

  // update totals/keys from Woo response
  const setTotals = useCart((s) => s.setTotals);
  const attachStoreKeys = useCart((s) => s.attachStoreKeys);

  // fallback sync uses the whole cart
  const allItems = useCart((s) => s.items);

  const min = limits?.min ?? 1;
  const max = limits?.max ?? 9999;
  const step = limits?.step ?? 1;
  const editable = limits?.editable ?? true;

  const canDec = editable && item.quantity - step >= min;
  const canInc = editable && item.quantity + step <= max;

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // ✅ NEW: inline “stock/limit” message (line item scope)
  const [limitMsg, setLimitMsg] = React.useState<string | null>(null);
  const limitTimer = React.useRef<any>(null);

  const abortRef = React.useRef<AbortController | null>(null);
  const seqRef = React.useRef(0);

  const atMax = editable && item.quantity >= max;

  const autoLimitMsg =
    atMax
      ? (max <= 1 ? "Limited to 1 per order." : `Max available reached (${max}).`)
      : null;

  function showLimit(message: string) {
    setLimitMsg(message);
    if (limitTimer.current) clearTimeout(limitTimer.current);
    limitTimer.current = setTimeout(() => setLimitMsg(null), 2400);
  }

  React.useEffect(() => {
    return () => {
      if (limitTimer.current) clearTimeout(limitTimer.current);
    };
  }, []);

  async function storeFetch(path: string, init?: RequestInit) {
    const token = readCartToken();
    const res = await fetch(path, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
        ...(token ? { "x-cart-token": token } : {}),
      },
      signal: (init as any)?.signal,
    });

    const nextToken = res.headers.get("x-cart-token") || "";
    if (nextToken) writeCartToken(nextToken);

    return res;
  }

  function applyStoreCartPayload(cj: StoreCartResponse | null) {
    if (!cj) return;

    // attach Woo line keys -> local items
    const wooItems = Array.isArray(cj.items) ? cj.items : [];
    attachStoreKeys(wooItems.map((w) => ({ key: w.key, id: Number(w.id) })));

    // update totals used by order summary
    setTotals(storeTotalsToCartTotals(cj.totals));
  }

  async function syncAllItemsToWoo() {
    const res = await storeFetch("/api/store/cart/sync", {
      method: "POST",
      body: JSON.stringify({
        items: allItems.map((i) => ({
          productId: i.productId,
          variationId: i.variationId,
          quantity: i.quantity,
        })),
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    const cj = (await res.json().catch(() => null)) as StoreCartResponse | null;
    applyStoreCartPayload(cj);
  }

  async function updateWooQty(nextQty: number) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const seq = ++seqRef.current;

    setBusy(true);
    setErr(null);

    try {
      if (item.storeKey) {
        const res = await storeFetch("/api/store/cart/update-item", {
          method: "POST",
          body: JSON.stringify({ key: item.storeKey, quantity: nextQty }),
          signal: controller.signal,
        } as any);

        if (seq !== seqRef.current) return;
        if (!res.ok) throw new Error(await res.text());

        const cj = (await res.json().catch(() => null)) as StoreCartResponse | null;
        if (seq !== seqRef.current) return;

        applyStoreCartPayload(cj);
        return;
      }

      await syncAllItemsToWoo();
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setErr(e?.message || "Update failed");
    } finally {
      if (seq === seqRef.current) setBusy(false);
    }
  }

  async function onMinus() {
    setLimitMsg(null);
    if (!canDec) {
      showLimit(`Minimum quantity is ${min}.`);
      return;
    }
    const nextQty = Math.max(min, item.quantity - step);
    setQtyFast(item.key, nextQty);
    window.dispatchEvent(new Event("bisogo:cart-changed"));
    await updateWooQty(nextQty);
  }

  async function onPlus() {
    setLimitMsg(null);

    if (!editable) {
      showLimit("This item quantity can’t be edited.");
      return;
    }

    if (!canInc) {
      // ✅ This is the “beautiful info message” you asked for
      // (We don’t know “out of stock”, only “max allowed”, but UX text can still be friendly.)
      showLimit(max <= 1 ? "This item is limited to 1 per order." : `You’ve reached the max available (${max}).`);
      return;
    }

    const nextQty = Math.min(max, item.quantity + step);
    setQtyFast(item.key, nextQty);
    window.dispatchEvent(new Event("bisogo:cart-changed"));
    await updateWooQty(nextQty);
  }

  async function onRemove() {
    // optimistic remove
    removeLocal(item.key);

    try {
      setBusy(true);
      setErr(null);
      setLimitMsg(null);

      if (item.storeKey) {
        const res = await storeFetch("/api/store/cart/remove-item", {
          method: "POST",
          body: JSON.stringify({ key: item.storeKey }),
        });

        if (!res.ok) throw new Error(await res.text());
        const cj = (await res.json().catch(() => null)) as StoreCartResponse | null;
        applyStoreCartPayload(cj);
        window.dispatchEvent(new Event("bisogo:cart-changed"));
        return;
      }

      await syncAllItemsToWoo();
      window.dispatchEvent(new Event("bisogo:cart-changed"));
    } catch (e: any) {
      setErr(e?.message || "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-4 p-5">
      <div className="relative h-20 w-20 overflow-hidden rounded-[calc(var(--radius)-6px)] border border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href={`/product/${item.slug}`} className="text-sm font-semibold hover:underline underline-offset-4">
              {item.name}
            </Link>

            {item.attributes ? (
              <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                {Object.entries(item.attributes).map(([k, v]) => (
                  <span key={k} className="mr-2">
                    {k}: {v}
                  </span>
                ))}
              </div>
            ) : null}

            {/* ✅ reserved space for status (no CLS) */}
            <div className="mt-1 min-h-[16px]">
              {limitMsg ? (
                <div className="text-[11px] text-amber-700">{limitMsg}</div>
              ) : autoLimitMsg ? (
                <div className="text-[11px] text-amber-700">{autoLimitMsg}</div>
              ) : (
                <span
                  className={[
                    "text-[11px] text-[color:var(--color-muted-foreground)] transition-opacity",
                    busy ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                >
                  Updating…
                </span>
              )}
            </div>

            {err ? <div className="mt-1 text-[11px] text-red-600">{err}</div> : null}
          </div>

          <div className="text-sm font-medium">₱{(item.price * item.quantity).toFixed(2)}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-[calc(var(--radius)-2px)] border border-[color:var(--color-border)]">
            <button
              type="button"
              className="h-9 w-9 hover:bg-[color:var(--color-muted)] disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={onMinus}
              disabled={busy || !canDec}
              aria-label="Decrease quantity"
              title={!canDec ? `Minimum is ${min}` : undefined}
            >
              -
            </button>

            <div className="w-12 text-center text-sm">{item.quantity}</div>

            <button
              type="button"
              className="h-9 w-9 hover:bg-[color:var(--color-muted)] disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={onPlus}
              disabled={busy || !editable || !canInc}
              aria-label="Increase quantity"
              title={!editable ? "Not editable" : !canInc ? `Max is ${max}` : undefined}
            >
              +
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={onRemove} disabled={busy}>
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}