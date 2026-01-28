"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  key: string;
  productId: number;
  variationId?: number;
  slug: string;
  name: string;
  image: string | null;
  price: number;
  currency: string;
  quantity: number;
  attributes?: Record<string, string>;
};

type CartState = {
  items: CartItem[];
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  addItem: (item: Omit<CartItem, "key">) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

function makeKey(item: Omit<CartItem, "key">) {
  const attrs = item.attributes ? JSON.stringify(Object.entries(item.attributes).sort()) : "";
  return `${item.productId}:${item.variationId || 0}:${attrs}`;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      addItem: (item) =>
        set((state) => {
          const key = makeKey(item);
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: state.items.map((i) => (i.key === key ? { ...i, quantity: i.quantity + item.quantity } : i)),
            };
          }
          return { items: [...state.items, { ...item, key }] };
        }),

      removeItem: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),

      setQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, quantity) } : i)),
        })),

      clear: () => set({ items: [] }),

      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "bisogo_cart_v1",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);