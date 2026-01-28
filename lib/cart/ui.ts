"use client";

import { create } from "zustand";

export type CartToastPayload = {
  title?: string;
  message?: string;
  product?: {
    name: string;
    image?: string | null;
    price?: number;
    currency?: string;
    quantity?: number;
  };
  /** auto dismiss ms (default 4000) */
  ttlMs?: number;
};

export type CartToast = CartToastPayload & {
  id: string;
  createdAt: number;
};

type CartUIState = {
  // drawer (keep if you still want it elsewhere; harmless)
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;

  // toast queue
  toasts: CartToast[];
  showToast: (payload: CartToastPayload) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useCartUI = create<CartUIState>((set, get) => ({
  isOpen: false,
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),

  toasts: [],

  showToast: (payload) => {
    const id = uid();
    const createdAt = Date.now();
    const toast: CartToast = { id, createdAt, ...payload };

    // push newest on top
    set((s) => ({ toasts: [toast, ...s.toasts].slice(0, 3) })); // keep max 3

    const ttl = payload.ttlMs ?? 4000;
    window.setTimeout(() => {
      // guard: only remove if still present
      const stillThere = get().toasts.some((t) => t.id === id);
      if (stillThere) get().hideToast(id);
    }, ttl);
  },

  hideToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));