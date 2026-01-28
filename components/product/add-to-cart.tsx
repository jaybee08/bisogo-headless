"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { cn } from "@/lib/utils";
import { useCartUI } from "@/lib/cart/ui";

type Variation = {
  id: number;
  name: string;
  price: number;
  stockStatus?: string;
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
};

export function AddToCart({ product }: { product: ProductForCart }) {
  const add = useCart((s) => s.addItem);
  const showToast = useCartUI((s) => s.showToast);

  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const resolved = useMemo(() => {
    if (!product.variations.length)
      return { price: product.basePrice, variationId: undefined as number | undefined };

    const match = product.variations.find((v) =>
      Object.entries(v.attributes).every(([k, v2]) => selected[k] === v2)
    );

    return { price: match?.price ?? product.basePrice, variationId: match?.id };
  }, [product.variations, product.basePrice, selected]);

  const canAdd = useMemo(() => {
    if (!product.attributes.length) return true;
    return product.attributes.every((a) => selected[a.name]);
  }, [product.attributes, selected]);

  return (
    <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-5">
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

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-[calc(var(--radius)-2px)] border border-[color:var(--color-border)]">
          <button
            type="button"
            className="h-10 w-10 hover:bg-[color:var(--color-muted)]"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            -
          </button>
          <div className="w-14 text-center text-sm">{qty}</div>
          <button
            type="button"
            className="h-10 w-10 hover:bg-[color:var(--color-muted)]"
            onClick={() => setQty((q) => q + 1)}
          >
            +
          </button>
        </div>

        <Button
          className="flex-1"
          onClick={() => {
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
          disabled={!canAdd}
        >
          {canAdd ? "Add to cart" : "Select options"}
        </Button>

        <div className="text-sm text-[color:var(--color-muted-foreground)]">
          ₱{resolved.price.toFixed(2)}
        </div>
      </div>
    </div>
  );
}