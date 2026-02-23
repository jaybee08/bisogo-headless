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
  // Optional if you later pass these for variations:
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

  // ✅ from Woo
  soldIndividually?: boolean; // sold_individually
  maxPurchaseQty?: number; // max_purchase_quantity

  // ✅ stock/backorder info (simple product or resolved variant if you pass it)
  stockStatus?: "instock" | "outofstock" | string;
  stockQty?: number | null;
  backorders?: "no" | "notify" | "yes"; // Woo REST uses this
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

  // qty already in cart for this exact line
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

  // base max by purchase rules
  const ruleMaxQty = soldIndividually
    ? 1
    : Math.max(1, Number(product.maxPurchaseQty ?? 9999));

  // stock (only enforce when backorders NOT allowed)
  const stockQty =
    Number.isFinite(Number(resolved.stockQty)) ? Number(resolved.stockQty) : null;

  const remainingByStock =
    !backordersAllowed && stockQty !== null
      ? Math.max(0, stockQty - inCartQty)
      : ruleMaxQty;

  // ✅ allow maxQty to be 0 when stock is exhausted (and backorders not allowed)
  const maxQty = !backordersAllowed
    ? Math.min(ruleMaxQty, remainingByStock) // can be 0
    : ruleMaxQty;

  // keep qty valid
  useEffect(() => {
    setQty((q) => {
      if (maxQty <= 0) return 1; // keep display stable; ATC will be disabled anyway
      return Math.min(Math.max(1, q), maxQty);
    });
  }, [maxQty]);

  // ✅ hard-stop condition
  const outOfStockHard =
    !backordersAllowed && stockQty !== null && remainingByStock <= 0;

  const isAlreadyAtLimit = (soldIndividually && inCartQty >= 1) || outOfStockHard;

  const disableAtc = !canSelectAllOptions || isAlreadyAtLimit;

  const priceLabel = `₱${resolved.price.toFixed(2)}`;

  // ✅ also lock qty controls when already at limit (prevents confusing clicks)
  const canDec = !isAlreadyAtLimit && qty > 1;
  const canInc = !isAlreadyAtLimit && maxQty > 0 && qty < maxQty;

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

  // ✅ button label states
  const buttonLabel = !canSelectAllOptions
    ? "Select options"
    : soldIndividually && inCartQty >= 1
      ? "Added"
      : outOfStockHard
        ? "Out of stock"
        : "Add to cart";

  return (
    <div
      id="pdp-atc"
      className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-5"
    >
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

      <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <div className="flex items-center justify-between gap-3 sm:contents">
          {/* Qty */}
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
              onClick={() => setQty((q) => Math.min(Math.max(1, maxQty), q + 1))}
              disabled={!canInc}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Pills */}
          <div className="flex flex-wrap items-center gap-2 sm:contents">
            {limitNote ? (
              <span className="inline-flex items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-3 py-1 text-xs text-[color:var(--color-muted-foreground)]">
                {limitNote}
              </span>
            ) : null}

            {showBackorderPill ? (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
                Backorder • Ships later
              </span>
            ) : null}

            {/* ✅ Helpful message when stock is fully in cart (no backorders) */}
            {outOfStockHard ? (
              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                No more stock available
              </span>
            ) : null}
          </div>

          {/* Mobile price */}
          <div className="sm:hidden text-sm font-medium text-[color:var(--color-foreground)]">
            {priceLabel}
          </div>
        </div>

        {/* ATC Button */}
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
              quantity: Math.min(qty, Math.max(1, ruleMaxQty)), // safe cap by rule
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
          {buttonLabel}
        </Button>

        {/* Desktop price */}
        <div className="hidden sm:block text-sm text-[color:var(--color-muted-foreground)]">
          {priceLabel}
        </div>
      </div>
    </div>
  );
}