"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/store";

type Props = {
  orderId: string;
  orderKey: string;
};

/**
 * Clears the cart one time per order (prevents clearing again on refresh).
 * Uses localStorage so it persists across reloads.
 */
export function ClearCartOnce({ orderId, orderKey }: Props) {
  const clear = useCart((s) => s.clear);

  useEffect(() => {
    if (!orderId || !orderKey) return;

    const storageKey = `bisogo:cart_cleared:${orderId}:${orderKey}`;
    try {
      const already = localStorage.getItem(storageKey);
      if (already === "1") return;

      clear();
      localStorage.setItem(storageKey, "1");
    } catch {
      // If storage is blocked, still clear cart once for this render.
      clear();
    }
  }, [orderId, orderKey, clear]);

  return null;
}