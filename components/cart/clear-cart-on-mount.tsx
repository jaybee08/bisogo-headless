"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/store";

export function ClearCartOnMount() {
  const clear = useCart((s) => s.clear);

  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}