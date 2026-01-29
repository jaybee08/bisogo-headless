"use client";

import * as React from "react";
import Image from "next/image";
import { useCartUI } from "@/lib/cart/ui";

type Props = {
  name: string;
  priceLabel: string; // e.g. ₱599.00
  image?: string | null;
  targetId?: string; // where your main ATC block is
};

export function StickyAtc({ name, priceLabel, image, targetId = "pdp-atc" }: Props) {
  const [show, setShow] = React.useState(false);
  const showToast = useCartUI((s) => s.showToast);

  React.useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    // Show sticky when the main ATC is not visible
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      {
        root: null,
        threshold: 0.2,
        rootMargin: "-80px 0px -120px 0px",
      }
    );

    io.observe(target);
    return () => io.disconnect();
  }, [targetId]);

  const scrollToAtc = () => {
    const el = document.getElementById(targetId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleClick = () => {
    // Best path: trigger the real PDP AddToCart button (so it uses real state)
    const btn = document.querySelector<HTMLButtonElement>('[data-atc-primary="1"]');

    if (btn) {
      // If disabled, show toast + scroll to options
      if (btn.disabled || btn.getAttribute("aria-disabled") === "true") {
        showToast({
          title: "Select options first",
          // if your toast supports description, keep it; if not, it will be ignored safely
          description: "Please choose a size/variant before adding to cart.",
          ttlMs: 4500,
        } as any);

        scrollToAtc();
        return;
      }

      btn.click();
      return;
    }

    // Fallback: scroll to ATC
    scrollToAtc();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[color:var(--color-border)] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3">
          {image ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-muted)] max-[380px]:hidden">
              <Image src={image} alt={name} fill className="object-cover" />
            </div>
          ) : null}

          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="text-xs text-[color:var(--color-muted-foreground)]">{priceLabel}</div>
          </div>
        </div>

        {/* Right */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleClick}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-foreground)] px-5 text-sm font-semibold text-white whitespace-nowrap hover:opacity-90 min-w-[132px]"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}