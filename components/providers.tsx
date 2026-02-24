"use client";

import * as React from "react";
import { SessionProvider } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";

function TopRouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const rafRef = React.useRef<number | null>(null);
  const tickingRef = React.useRef(false);

  const start = React.useCallback(() => {
    if (tickingRef.current) return;

    tickingRef.current = true;
    setVisible(true);
    setProgress((p) => (p > 0 && p < 90 ? p : 12)); // initial jump

    const tick = () => {
      setProgress((p) => {
        // slowly approach 90%
        const next = p + Math.max(0.25, (90 - p) * 0.06);
        return next >= 90 ? 90 : next;
      });
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }, []);

  const done = React.useCallback(() => {
    if (!tickingRef.current) return;

    tickingRef.current = false;
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    setProgress(100);
    window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
  }, []);

  // Start loader on internal link click (capture phase)
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return; // left click only
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;

      const hrefAttr = a.getAttribute("href") || "";
      if (!hrefAttr) return;
      if (hrefAttr.startsWith("#")) return;
      if (a.getAttribute("target") === "_blank") return;
      if (a.getAttribute("download") != null) return;

      // ignore external links + same-page nav
      try {
        const url = new URL(a.href, window.location.href);
        if (url.origin !== window.location.origin) return;

        const current = window.location.pathname + window.location.search;
        const next = url.pathname + url.search;
        if (current === next) return;

        start();
      } catch {
        // ignore
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  // Stop loader when route changes
  React.useEffect(() => {
    done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999] h-[2px] w-full"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
    >
      <div
        // className="h-full bg-[color:var(--color-foreground)]"
        className="h-full bg-[#1DB954]"
        style={{
          width: `${progress}%`,
          transition: "width 120ms ease",
          transform: "translateZ(0)",
        }}
      />
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TopRouteLoader />
      {children}
    </SessionProvider>
  );
}