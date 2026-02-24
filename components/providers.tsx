"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Minimal top loading bar (Spotify green).
 * - Starts on internal link click (instant)
 * - Finishes when pathname changes
 * - No useSearchParams -> avoids Suspense build issues
 */
function TopProgressBar({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999] h-[3px] w-full"
    >
      <div
        className={[
          "h-full origin-left bg-[#1DB954] transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{
          // Fake progress animation while loading
          animation: active ? "bisogoProgress 1.1s ease-out infinite" : "none",
        }}
      />
      <style jsx global>{`
        @keyframes bisogoProgress {
          0% {
            transform: scaleX(0.08);
          }
          40% {
            transform: scaleX(0.55);
          }
          70% {
            transform: scaleX(0.82);
          }
          100% {
            transform: scaleX(0.98);
          }
        }
      `}</style>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  // Stop loader after navigation completes (pathname changed)
  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  // Start loader immediately when clicking any internal link
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // allow new tab / download / etc
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;

      const href = a.getAttribute("href") || "";
      if (!href) return;

      // ignore external links / anchors / mailto / tel
      if (href.startsWith("#")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (a.target === "_blank") return;

      // If it’s an absolute URL, only handle if same-origin
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;

        // same page -> don’t animate
        const nextPath = url.pathname + url.search + url.hash;
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        if (nextPath === currentPath) return;

        // start
        setLoading(true);
      } catch {
        // relative path -> safe to treat as internal
        if (href.startsWith("/")) setLoading(true);
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <SessionProvider>
      <TopProgressBar active={loading} />
      {children}
    </SessionProvider>
  );
}