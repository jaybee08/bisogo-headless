"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { cn } from "@/lib/utils";
import { useCartUI } from "@/lib/cart/ui";

type Variation = {
  id: number;
  name: string;
  price: number;
  stockStatus?: string; // "instock" | "outofstock" (best-effort)
  stockQty?: number | null;
  backorders?: "no" | "notify" | "yes";
  attributes: Record<string, string>;
};

type ProductForCart = {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  basePrice: number;
  currency: string;
  attributes: { name: string; options: string[] }[];
  variations: Variation[];

  soldIndividually?: boolean;
  maxPurchaseQty?: number;

  stockStatus?: "instock" | "outofstock" | string;
  stockQty?: number | null;
  backorders?: "no" | "notify" | "yes";
};

function sameAttributes(a?: Record<string, string>, b?: Record<string, string>) {
  const aa = a || {};
  const bb = b || {};
  const aKeys = Object.keys(aa);
  const bKeys = Object.keys(bb);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (aa[k] !== bb[k]) return false;
  }
  return true;
}

export function AddToCart({ product }: { product: ProductForCart }) {
  const add = useCart((s) => s.addItem);
  const items = useCart((s) => s.items);
  const showToast = useCartUI((s) => s.showToast);

  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const resolved = useMemo(() => {
    if (!product.variations.length) {
      return {
        price: product.basePrice,
        variationId: undefined as number | undefined,
        stockStatus: product.stockStatus,
        stockQty: product.stockQty,
        backorders: product.backorders,
      };
    }

    const match = product.variations.find((v) =>
      Object.entries(v.attributes).every(([k, v2]) => selected[k] === v2)
    );

    return {
      price: match?.price ?? product.basePrice,
      variationId: match?.id,
      stockStatus: match?.stockStatus ?? product.stockStatus,
      stockQty: match?.stockQty ?? product.stockQty,
      backorders: match?.backorders ?? product.backorders,
    };
  }, [
    product.variations,
    product.basePrice,
    product.stockStatus,
    product.stockQty,
    product.backorders,
    selected,
  ]);

  const canSelectAllOptions = useMemo(() => {
    if (!product.attributes.length) return true;
    return product.attributes.every((a) => selected[a.name]);
  }, [product.attributes, selected]);

  const inCartQty = useMemo(() => {
    const vId = resolved.variationId;
    const attrs = Object.keys(selected).length ? selected : undefined;

    return items.reduce((sum, it) => {
      if (it.productId !== product.productId) return sum;
      if ((it.variationId || undefined) !== (vId || undefined)) return sum;
      if (!sameAttributes(it.attributes, attrs)) return sum;
      return sum + (it.quantity || 0);
    }, 0);
  }, [items, product.productId, resolved.variationId, selected]);

  const soldIndividually = !!product.soldIndividually;

  const backordersMode = (resolved.backorders || "no") as "no" | "notify" | "yes";
  const backordersAllowed = backordersMode === "yes" || backordersMode === "notify";

  const ruleMaxQty = soldIndividually
    ? 1
    : Math.max(1, Number(product.maxPurchaseQty ?? 9999));

  const stockQty =
    Number.isFinite(Number(resolved.stockQty)) ? Number(resolved.stockQty) : null;

  const remainingByStock =
    !backordersAllowed && stockQty !== null
      ? Math.max(0, stockQty - inCartQty)
      : ruleMaxQty;

  const maxQty = Math.max(1, Math.min(ruleMaxQty, remainingByStock));

  useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), maxQty));
  }, [maxQty]);

  const isAlreadyAtLimit =
    (soldIndividually && inCartQty >= 1) ||
    (!backordersAllowed && stockQty !== null && remainingByStock <= 0);

  const disableAtc = !canSelectAllOptions || isAlreadyAtLimit;

  const priceLabel = `₱${resolved.price.toFixed(2)}`;
  const canDec = qty > 1;
  const canInc = qty < maxQty;

  const showBackorderPill =
    backordersAllowed &&
    (String(resolved.stockStatus || "").toLowerCase().includes("out") ||
      (stockQty !== null && stockQty <= 0));

  const limitNote =
    soldIndividually && inCartQty >= 1
      ? "Limited to 1 per order — already in your cart."
      : soldIndividually
      ? "Limited to 1 per order."
      : null;

  const showNoStockPill =
    !backordersAllowed &&
    stockQty !== null &&
    stockQty > 0 &&
    remainingByStock <= 0;

  return (
    <div id="pdp-atc" className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-5">
      {product.attributes.length ? (
        <div className="space-y-4">
          {product.attributes.map((attr) => (
            <div key={attr.name}>
              <div className="text-sm font-semibold">{attr.name}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {attr.options.map((opt) => {
                  const active = selected[attr.name] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelected((s) => ({ ...s, [attr.name]: opt }))}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm",
                        active
                          ? "border-transparent bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]"
                          : "border-[color:var(--color-border)] hover:bg-[color:var(--color-muted)]"
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ✅ MOBILE: 3-row layout (qty+price) -> pills -> button */}
      {/* ✅ DESKTOP: inline row */}
      <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        {/* Row: qty + (mobile price) */}
        <div className="flex items-center justify-between gap-3 sm:justify-start">
          <div className="flex items-center rounded-[calc(var(--radius)-2px)] border border-[color:var(--color-border)]">
            <button
              type="button"
              className="h-10 w-10 hover:bg-[color:var(--color-muted)] disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={!canDec}
              aria-label="Decrease quantity"
            >
              -
            </button>
            <div className="w-14 text-center text-sm">{qty}</div>
            <button
              type="button"
              className="h-10 w-10 hover:bg-[color:var(--color-muted)] disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={!canInc}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <div className="sm:hidden text-sm font-medium text-[color:var(--color-foreground)] tabular-nums">
            {priceLabel}
          </div>
        </div>

        {/* Row: pills (wrap cleanly on mobile) */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-1">
          {limitNote ? (
            <span className="max-w-full inline-flex items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-3 py-1 text-xs text-[color:var(--color-muted-foreground)] whitespace-normal">
              {limitNote}
            </span>
          ) : null}

          {showNoStockPill ? (
            <span className="max-w-full inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 whitespace-normal">
              No more stock available
            </span>
          ) : null}

          {showBackorderPill ? (
            <span className="max-w-full inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 whitespace-normal">
              Backorder • Ships later
            </span>
          ) : null}
        </div>

        {/* Button */}
        <Button
          data-atc-primary="1"
          className="h-11 w-full whitespace-nowrap sm:w-auto sm:flex-1"
          onClick={() => {
            const cartItem = {
              productId: product.productId,
              variationId: resolved.variationId,
              slug: product.slug,
              name: product.name,
              image: product.image,
              price: resolved.price,
              currency: product.currency,
              quantity: Math.min(qty, maxQty),
              attributes: Object.keys(selected).length ? selected : undefined,
            };

            add(cartItem);

            showToast({
              title: "Added to cart",
              product: {
                name: cartItem.name,
                image: cartItem.image,
                price: cartItem.price,
                currency: cartItem.currency,
                quantity: cartItem.quantity,
              },
              ttlMs: 4500,
            });
          }}
          disabled={disableAtc}
        >
          {!canSelectAllOptions ? "Select options" : isAlreadyAtLimit ? "Added" : "Add to cart"}
        </Button>

        {/* Desktop price */}
        <div className="hidden sm:block text-sm text-[color:var(--color-muted-foreground)] tabular-nums">
          {priceLabel}
        </div>
      </div>
    </div>
  );
}