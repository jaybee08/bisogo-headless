"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  key: string; // local deterministic key (productId:variationId:attrs)
  productId: number;
  variationId?: number;

  // ✅ NEW: Woo Store API cart line key (32 chars) used for /cart/update-item
  storeKey?: string;

  slug: string;
  name: string;
  image: string | null;
  price: number;
  currency: string;
  quantity: number;
  attributes?: Record<string, string>;
};

// ✅ Totals coming from Woo Store API (already in pesos)
export type CartTotals = {
  subtotal: number; // items subtotal
  shipping: number;
  discount: number;
  total: number;
  currency: string; // "PHP"
};

type CartState = {
  items: CartItem[];
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  totals: CartTotals | null;
  setTotals: (t: CartTotals | null) => void;

  // ✅ When you know totals are stale (coupon/address/shipping-rate changes)
  invalidateTotals: () => void;

  addItem: (item: Omit<CartItem, "key" | "storeKey">) => void;
  removeItem: (key: string) => void;

  // Keep your old API (used by CartLine)
  setQuantity: (key: string, quantity: number) => void;

  // ✅ NEW: UI-only qty update that does NOT clear totals immediately
  // (because totals will be replaced by Woo response after update-item)
  setQuantityFast: (key: string, quantity: number) => void;

  clear: () => void;

  count: () => number;
  subtotal: () => number; // local fallback

  // ✅ NEW: attach Woo store cart keys to local items after /api/store/cart
  // Accepts a minimal shape from Woo Store API cart response.
  attachStoreKeys: (wooItems: Array<{ key: string; id: number }>) => void;

  // ✅ NEW: helper to find an item’s Woo storeKey quickly
  getStoreKeyForLocalKey: (localKey: string) => string | undefined;
};

function makeKey(item: Omit<CartItem, "key" | "storeKey">) {
  const attrs = item.attributes
    ? JSON.stringify(Object.entries(item.attributes).sort())
    : "";
  return `${item.productId}:${item.variationId || 0}:${attrs}`;
}

// Woo cart line "id" is typically:
// - simple product: productId
// - variation: variationId
function desiredWooLineId(i: { productId: number; variationId?: number }) {
  return Number(i.variationId ?? i.productId);
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      totals: null,
      setTotals: (t) => set({ totals: t }),
      invalidateTotals: () => set({ totals: null }),

      addItem: (item) =>
        set((state) => {
          const key = makeKey(item);
          const existing = state.items.find((i) => i.key === key);

          // Adding items changes cart → totals will be recalculated by Woo
          // Clear totals so UI can show "updating…" if you want.
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
              totals: null,
            };
          }

          return {
            items: [...state.items, { ...item, key }],
            totals: null,
          };
        }),

      removeItem: (key) =>
        set((state) => ({
          items: state.items.filter((i) => i.key !== key),
          totals: null,
        })),

      // OLD behavior (kept): clears totals immediately
      setQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.key === key ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
          totals: null,
        })),

      // ✅ NEW: do not clear totals (prevents "Total: —" flicker)
      setQuantityFast: (key, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.key === key ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        })),

      clear: () => set({ items: [], totals: null }),

      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      getStoreKeyForLocalKey: (localKey) =>
        get().items.find((i) => i.key === localKey)?.storeKey,

      // ✅ Map Woo cart line keys -> local items so we can update-item quickly
      attachStoreKeys: (wooItems) =>
        set((state) => {
          if (!Array.isArray(wooItems) || !wooItems.length) return state;

          // Build lookup by Woo "id" (productId or variationId)
          const wooById = new Map<number, string>();
          for (const w of wooItems) {
            const id = Number(w?.id);
            const k = String(w?.key || "");
            if (Number.isFinite(id) && id > 0 && k) wooById.set(id, k);
          }

          let changed = false;

          const nextItems = state.items.map((i) => {
            const wantId = desiredWooLineId(i);
            const storeKey = wooById.get(wantId);

            if (storeKey && i.storeKey !== storeKey) {
              changed = true;
              return { ...i, storeKey };
            }
            return i;
          });

          return changed ? { ...state, items: nextItems } : state;
        }),
    }),
    {
      name: "bisogo_cart_v1",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);