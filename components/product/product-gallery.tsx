"use client";

import * as React from "react";
import Image from "next/image";

type GalleryImage = { url: string; alt?: string };

export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const clean = (images || []).filter((i) => i?.url);

  const [active, setActive] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  // Keep active in range if images change
  React.useEffect(() => {
    if (!clean.length) return;
    setActive((a) => Math.max(0, Math.min(clean.length - 1, a)));
  }, [clean.length]);

  // Keyboard controls in lightbox
  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };

    window.addEventListener("keydown", onKey);
    // prevent background scroll while open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active, clean.length]);

  const current = clean[active] || null;

  const prev = React.useCallback(() => {
    if (!clean.length) return;
    setActive((a) => (a - 1 + clean.length) % clean.length);
  }, [clean.length]);

  const next = React.useCallback(() => {
    if (!clean.length) return;
    setActive((a) => (a + 1) % clean.length);
  }, [clean.length]);

  const onThumbClick = (idx: number) => {
    setActive(idx);
  };

  // Swipe handling (lightbox)
  const touchRef = React.useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches?.[0];
    if (!t) return;
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;

    const t = e.changedTouches?.[0];
    if (!t) return;

    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    // ignore vertical scroll gestures
    if (Math.abs(dy) > Math.abs(dx)) return;

    // threshold
    if (dx > 50) prev();
    if (dx < -50) next();
  };

  if (!clean.length) {
    return (
      <div className="aspect-square rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-muted)]" />
    );
  }

  return (
    <div className="overflow-x-hidden">
      {/* Main image */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full"
        aria-label="Open image gallery"
      >
        <div className="aspect-square overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
          <Image
            src={current!.url}
            alt={current?.alt || productName}
            width={1400}
            height={1400}
            sizes="(min-width: 1024px) 50vw, 100vw"
            loading="eager"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            priority
          />
        </div>

        {/* Counter */}
        {clean.length > 1 ? (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {active + 1} / {clean.length}
          </div>
        ) : null}
      </button>

      {/* Thumbnails */}
      {clean.length > 1 ? (
        <div className="mt-3">
          {/* Desktop: grid of thumbs */}
          <div className="hidden sm:grid grid-cols-6 gap-3">
            {clean.slice(0, 12).map((img, idx) => (
              <button
                key={`${img.url}-${idx}`}
                type="button"
                onClick={() => onThumbClick(idx)}
                className={[
                  "aspect-square overflow-hidden rounded-[var(--radius)] border bg-[color:var(--color-muted)]",
                  idx === active
                    ? "border-[color:var(--color-foreground)]"
                    : "border-[color:var(--color-border)] hover:border-[color:var(--color-foreground)]/40",
                ].join(" ")}
                aria-label={`View image ${idx + 1}`}
                aria-current={idx === active}
              >
                <Image
                  src={img.url}
                  alt={img.alt || productName}
                  width={220}
                  height={220}
                  className="h-full w-full object-cover"
                  sizes="56px"
                />
              </button>
            ))}
          </div>

          {/* Mobile: horizontal scroll thumbs */}
          <div className="sm:hidden flex gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            {clean.map((img, idx) => (
              <button
                key={`${img.url}-${idx}`}
                type="button"
                onClick={() => onThumbClick(idx)}
                className={[
                  "shrink-0 h-20 w-20 overflow-hidden rounded-[var(--radius)] border bg-[color:var(--color-muted)]",
                  idx === active
                    ? "border-[color:var(--color-foreground)]"
                    : "border-[color:var(--color-border)]",
                ].join(" ")}
                aria-label={`View image ${idx + 1}`}
                aria-current={idx === active}
              >
                <Image
                  src={img.url}
                  alt={img.alt || productName}
                  width={160}
                  height={160}
                  sizes="56px"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Lightbox */}
      {open ? (
        <div
          className="fixed inset-0 z-[9999] bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute inset-0"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          />

          {/* Content wrapper (stop propagation so clicking image doesn't close) */}
          <div
            className="absolute inset-0 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full max-w-4xl">
              {/* Close */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute -top-2 right-0 translate-y-[-100%] rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
                aria-label="Close gallery"
              >
                ✕
              </button>

              {/* Image */}
              <div className="relative mx-auto h-[70vh] w-full overflow-hidden rounded-[var(--radius)] bg-black">
                <Image
                  src={current!.url}
                  alt={current?.alt || productName}
                  fill
                  sizes="(max-width: 768px) 100vw, 900px"
                  className="object-contain"
                  priority
                />
              </div>

              {/* Nav + counter */}
              {clean.length > 1 ? (
                <>
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={prev}
                      className="rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                      aria-label="Previous image"
                    >
                      ← Prev
                    </button>

                    <div className="text-sm text-white/90">
                      {active + 1} / {clean.length}
                    </div>

                    <button
                      type="button"
                      onClick={next}
                      className="rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                      aria-label="Next image"
                    >
                      Next →
                    </button>
                  </div>

                  {/* Thumb strip inside lightbox */}
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                    {clean.map((img, idx) => (
                      <button
                        key={`lb-${img.url}-${idx}`}
                        type="button"
                        onClick={() => setActive(idx)}
                        className={[
                          "shrink-0 h-14 w-14 overflow-hidden rounded border",
                          idx === active
                            ? "border-white"
                            : "border-white/30 hover:border-white/60",
                        ].join(" ")}
                        aria-label={`Go to image ${idx + 1}`}
                        aria-current={idx === active}
                      >
                        <Image
                          src={img.url}
                          alt={img.alt || productName}
                          width={112}
                          height={112}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}