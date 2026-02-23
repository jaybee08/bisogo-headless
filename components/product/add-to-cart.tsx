"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { cn } from "@/lib/utils";
import { useCartUI } from "@/lib/cart/ui";

type StockStatus = "instock" | "outofstock" | "onbackorder" | string;

type Variation = {
  id: number;
  name: string;
  price: number;
  stockStatus?: StockStatus;

  // ✅ best-effort Woo fields (REST has these; GraphQL may differ)
  manageStock?: boolean;
  stockQuantity?: number | null;
  backorders?: "no" | "notify" | "yes" | string;
  soldIndividually?: boolean;

  attributes: Record<string, string>;
};

type ProductForCart = {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  basePrice: number;
  currency: string;

  // ✅ best-effort Woo fields (REST has these; GraphQL may differ)
  stockStatus?: StockStatus;
  manageStock?: boolean;
  stockQuantity?: number | null;
  backorders?: "no" | "notify" | "yes" | string;
  soldIndividually?: boolean;

  attributes: { name: string; options: string[] }[];
  variations: Variation[];
};

function normalizeStockStatus(s?: StockStatus) {
  const v = String(s || "").toLowerCase();
  if (v.includes("out")) return "outofstock";
  if (v.includes("back")) return "onbackorder";
  if (v.includes("in")) return "instock";
  return v || "instock";
}

function bool(v: any) {
  return v === true || v === "true" || v === 1 || v === "1";
}

/**
 * Compute max purchasable qty.
 * Returns:
 * - 0 => cannot purchase (OOS)
 * - 1..N => capped
 * - Infinity => no cap (or unknown cap)
 */
function computeMaxQty(input: {
  stockStatus?: StockStatus;
  manageStock?: boolean;
  stockQuantity?: number | null;
  backorders?: string;
  soldIndividually?: boolean;
}) {
  const stockStatus = normalizeStockStatus(input.stockStatus);
  const soldIndividually = bool(input.soldIndividually);

  if (soldIndividually) return 1;

  // If explicitly out of stock and no backorders => 0
  const backorders = String(input.backorders || "no").toLowerCase();
  const allowBackorders = backorders === "yes" || backorders === "notify";

  if (stockStatus === "outofstock" && !allowBackorders) return 0;

  const manageStock = bool(input.manageStock);
  const qty = input.stockQuantity;

  if (manageStock && typeof qty === "number" && Number.isFinite(qty)) {
    // If manage stock and qty is 0 (and no backorders), block
    if (qty <= 0 && !allowBackorders) return 0;
    // Otherwise cap to stock quantity
    return Math.max(0, Math.floor(qty));
  }

  // Not managing stock or unknown qty
  // If out of stock but backorders allowed => allow
  if (stockStatus === "outofstock" && allowBackorders) return Infinity;

  // Default: treat as purchasable with no known cap
  return Infinity;
}

export function AddToCart({ product }: { product: ProductForCart }) {
  const add = useCart((s) => s.addItem);
  const showToast = useCartUI((s) => s.showToast);

  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const resolved = useMemo(() => {
    if (!product.variations.length) {
      return {
        price: product.basePrice,
        variationId: undefined as number | undefined,
        stockStatus: product.stockStatus,
        manageStock: product.manageStock,
        stockQuantity: product.stockQuantity,
        backorders: product.backorders,
        soldIndividually: product.soldIndividually,
        matched: true,
      };
    }

    const match = product.variations.find((v) =>
      Object.entries(v.attributes).every(([k, v2]) => selected[k] === v2)
    );

    return {
      price: match?.price ?? product.basePrice,
      variationId: match?.id,
      stockStatus: match?.stockStatus ?? product.stockStatus,
      manageStock: match?.manageStock ?? product.manageStock,
      stockQuantity: match?.stockQuantity ?? product.stockQuantity,
      backorders: match?.backorders ?? product.backorders,
      soldIndividually: match?.soldIndividually ?? product.soldIndividually,
      matched: !!match || !product.attributes.length,
    };
  }, [product.variations, product.basePrice, product.stockStatus, product.manageStock, product.stockQuantity, product.backorders, product.soldIndividually, selected, product.attributes.length]);

  const canAddOptions = useMemo(() => {
    if (!product.attributes.length) return true;
    return product.attributes.every((a) => selected[a.name]);
  }, [product.attributes, selected]);

  const maxQty = useMemo(() => {
    // If options exist but no matching variation yet, don't clamp hard;
    // let user select options first.
    if (product.variations.length && !resolved.variationId) {
      // Still allow qty UI but keep it reasonable
      return Infinity;
    }
    return computeMaxQty({
      stockStatus: resolved.stockStatus,
      manageStock: resolved.manageStock,
      stockQuantity: resolved.stockQuantity,
      backorders: resolved.backorders,
      soldIndividually: resolved.soldIndividually,
    });
  }, [product.variations.length, resolved]);

  const isOOS = maxQty === 0;
  const isMaxReached = Number.isFinite(maxQty) && qty >= (maxQty as number);

  // Keep qty valid when max changes (e.g. user selects a variation w/ max=1)
  useEffect(() => {
    if (maxQty === 0) {
      setQty(1);
      return;
    }
    if (Number.isFinite(maxQty) && qty > (maxQty as number)) {
      setQty(Math.max(1, maxQty as number));
    }
    if (resolved.soldIndividually && qty !== 1) {
      setQty(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxQty, resolved.soldIndividually]);

  const canDec = qty > 1 && !isOOS;
  const canInc = !isOOS && !(Number.isFinite(maxQty) && qty >= (maxQty as number));

  const canSubmit = canAddOptions && !isOOS && (Number.isFinite(maxQty) ? qty <= (maxQty as number) : true);

  const priceLabel = `₱${resolved.price.toFixed(2)}`;

  const helperText = useMemo(() => {
    if (!canAddOptions) return null;

    // If variable product but no variationId yet, you may want to show guidance:
    if (product.variations.length && !resolved.variationId) {
      return "Select options to see availability.";
    }

    if (isOOS) return "Out of stock.";
    if (resolved.soldIndividually) return "Limited to 1 per order.";
    if (Number.isFinite(maxQty) && (maxQty as number) > 0 && isMaxReached) {
      return `Max available reached (${maxQty}).`;
    }
    return null;
  }, [canAddOptions, product.variations.length, resolved.variationId, isOOS, resolved.soldIndividually, maxQty, isMaxReached]);

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

      {/* Controls */}
      <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        {/* Row 1 on mobile: qty + price */}
        <div className="flex items-center justify-between gap-3 sm:contents">
          <div
            className={cn(
              "flex items-center rounded-[calc(var(--radius)-2px)] border border-[color:var(--color-border)]",
              isOOS && "opacity-60"
            )}
            aria-disabled={isOOS ? true : undefined}
          >
            <button
              type="button"
              className="h-10 w-10 hover:bg-[color:var(--color-muted)] disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              disabled={!canDec}
            >
              -
            </button>

            <div className="w-14 text-center text-sm tabular-nums">{qty}</div>

            <button
              type="button"
              className="h-10 w-10 hover:bg-[color:var(--color-muted)] disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Increase quantity"
              disabled={!canInc}
            >
              +
            </button>
          </div>

          {/* Mobile price */}
          <div className="sm:hidden text-sm font-medium text-[color:var(--color-foreground)]">{priceLabel}</div>
        </div>

        {/* helper message (no CLS) */}
        <div className="min-h-[18px] text-xs text-[color:var(--color-muted-foreground)]">
          {helperText ? (
            <span
              className={cn(
                "inline-flex rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-2 py-0.5",
                isOOS && "border-rose-200 bg-rose-50 text-rose-800"
              )}
            >
              {helperText}
            </span>
          ) : null}
        </div>

        {/* Button */}
        <Button
          data-atc-primary="1"
          className="h-11 w-full whitespace-nowrap sm:w-auto sm:flex-1"
          onClick={() => {
            // extra safety: don’t add if invalid
            if (!canSubmit) return;

            const cartItem = {
              productId: product.productId,
              variationId: resolved.variationId,
              slug: product.slug,
              name: product.name,
              image: product.image,
              price: resolved.price,
              currency: product.currency,
              quantity: qty,
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
          disabled={!canSubmit}
        >
          {!canAddOptions ? "Select options" : isOOS ? "Out of stock" : "Add to cart"}
        </Button>

        {/* Desktop price (right side) */}
        <div className="hidden sm:block text-sm text-[color:var(--color-muted-foreground)]">{priceLabel}</div>
      </div>
    </div>
  );
}