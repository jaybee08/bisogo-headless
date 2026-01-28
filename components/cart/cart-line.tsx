"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/lib/cart/store";

export function CartLine({ item }: { item: CartItem }) {
  const setQty = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.removeItem);

  return (
    <div className="flex gap-4 p-5">
      <div className="relative h-20 w-20 overflow-hidden rounded-[calc(var(--radius)-6px)] border border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
        {item.image ? <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" /> : null}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href={`/product/${item.slug}`} className="text-sm font-semibold hover:underline underline-offset-4">
              {item.name}
            </Link>
            {item.attributes ? (
              <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                {Object.entries(item.attributes).map(([k, v]) => (
                  <span key={k} className="mr-2">{k}: {v}</span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="text-sm font-medium">₱{(item.price * item.quantity).toFixed(2)}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-[calc(var(--radius)-2px)] border border-[color:var(--color-border)]">
            <button type="button" className="h-9 w-9 hover:bg-[color:var(--color-muted)]" onClick={() => setQty(item.key, Math.max(1, item.quantity - 1))}>
              -
            </button>
            <div className="w-12 text-center text-sm">{item.quantity}</div>
            <button type="button" className="h-9 w-9 hover:bg-[color:var(--color-muted)]" onClick={() => setQty(item.key, item.quantity + 1)}>
              +
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => remove(item.key)}>Remove</Button>
        </div>
      </div>
    </div>
  );
}
