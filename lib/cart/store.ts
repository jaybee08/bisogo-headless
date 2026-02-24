"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  key: string; // local deterministic key (productId:variationId:attrs)
  productId: number;
  variationId?: number;

  // ✅ Woo Store API cart line key (32 chars) used for /cart/update-item
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

  invalidateTotals: () => void;

  addItem: (item: Omit<CartItem, "key" | "storeKey">) => void;
  removeItem: (key: string) => void;

  setQuantity: (key: string, quantity: number) => void;
  setQuantityFast: (key: string, quantity: number) => void;

  clear: () => void;

  count: () => number;
  subtotal: () => number;

  attachStoreKeys: (wooItems: Array<{ key: string; id: number }>) => void;
  getStoreKeyForLocalKey: (localKey: string) => string | undefined;
};

function makeKey(item: Omit<CartItem, "key" | "storeKey">) {
  const attrs = item.attributes
    ? JSON.stringify(Object.entries(item.attributes).sort())
    : "";
  return `${item.productId}:${item.variationId || 0}:${attrs}`;
}

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

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key ? { ...i, quantity: i.quantity + item.quantity } : i
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

      setQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.key === key ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
          totals: null,
        })),

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

      attachStoreKeys: (wooItems) =>
        set((state) => {
          if (!Array.isArray(wooItems) || !wooItems.length) return state;

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

      // ✅ CRITICAL: do NOT touch localStorage on server/build
      storage:
        typeof window === "undefined"
          ? undefined
          : createJSONStorage(() => localStorage),

      onRehydrateStorage: () => (state) => {
        // runs on client after storage loads
        state?.setHasHydrated(true);
      },
    }
  )
);