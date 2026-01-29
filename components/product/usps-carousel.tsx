"use client";

import * as React from "react";

type USP = { title?: string; text?: string };

export function UspsCarousel({ usps }: { usps: USP[] }) {
  const clean = (usps || [])
    .map((u) => ({
      title: String(u?.title ?? "").trim(),
      text: String(u?.text ?? "").trim(),
    }))
    .filter((u) => u.title || u.text)
    .slice(0, 3);

  if (!clean.length) return null;

  return (
    <>
      {/* Mobile carousel */}
      <MobileDotsCarousel usps={clean} />

      {/* Desktop grid */}
      <div className="hidden sm:grid sm:grid-cols-3 sm:gap-3">
        {clean.map((u, idx) => (
          <div
            key={`usp-grid-${idx}`}
            className="min-w-0 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-4 text-sm"
          >
            {u.title ? <div className="font-semibold">{u.title}</div> : null}
            {u.text ? (
              <div className="mt-1 text-[color:var(--color-muted-foreground)]">
                {u.text}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

function MobileDotsCarousel({
  usps,
}: {
  usps: { title: string; text: string }[];
}) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const w = el.clientWidth || 1;
      const idx = Math.round(el.scrollLeft / w);
      setActive(Math.max(0, Math.min(usps.length - 1, idx)));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => el.removeEventListener("scroll", onScroll);
  }, [usps.length]);

  const goTo = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * idx, behavior: "smooth" });
  };

  // Single item: just render it, no scroller
  if (usps.length === 1) {
    const u = usps[0];
    return (
      <div className="sm:hidden w-full max-w-full min-w-0 overflow-hidden">
        <div className="w-full max-w-full min-w-0 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white px-6 py-8 text-center text-sm min-h-[220px] flex flex-col justify-center">
          {u.title ? <div className="font-semibold text-base">{u.title}</div> : null}
          {u.text ? (
            <div className="mt-2 text-[color:var(--color-muted-foreground)]">
              {u.text}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    // overflow hidden here prevents any bleed outside this block
    <div className="sm:hidden w-full max-w-full min-w-0 overflow-hidden">
      <div
        ref={scrollerRef}
        className="uspScroller no-scrollbar"
        aria-label="Product USPs"
      >
        {usps.map((u, idx) => (
          <div key={`usp-slide-${idx}`} className="uspSlide">
            <div className="uspCard">
              {u.title ? (
                <div className="font-semibold text-base">{u.title}</div>
              ) : null}
              {u.text ? (
                <div className="mt-2 text-[color:var(--color-muted-foreground)]">
                  {u.text}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* dots */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {usps.map((_, idx) => (
          <button
            key={`usp-dot-${idx}`}
            type="button"
            onClick={() => goTo(idx)}
            aria-label={`Go to USP ${idx + 1}`}
            aria-current={active === idx}
            className={[
              "h-2.5 w-2.5 rounded-full border",
              active === idx
                ? "bg-[color:var(--color-foreground)] border-[color:var(--color-foreground)]"
                : "bg-transparent border-[color:var(--color-border)]",
            ].join(" ")}
          />
        ))}
      </div>

      <style jsx global>{`
        /* THE FIX:
           Use grid auto-columns: 100% instead of flex.
           This prevents slides becoming wider than the viewport (your 469px issue).
        */
        .uspScroller {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;

          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: 100%;

          /* prevent any rounding overflow from affecting layout */
          contain: layout paint;
        }

        .uspSlide {
          scroll-snap-align: start;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .uspCard {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;

          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          background: #fff;

          padding: 32px 24px;
          min-height: 220px;

          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          font-size: 0.875rem;
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}