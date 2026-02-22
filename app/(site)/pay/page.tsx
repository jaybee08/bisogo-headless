"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function PayBridgePage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [didAttempt, setDidAttempt] = useState(false);

  const redirectUrl = useMemo(() => {
    const u = sp.get("u") || "";
    try {
      return u ? decodeURIComponent(u) : "";
    } catch {
      return "";
    }
  }, [sp]);

  useEffect(() => {
    if (!redirectUrl) return;

    // If user comes BACK here from Woo/Gateway, don't send them back into Woo again.
    const flagKey = `bisogo_pay_attempted:${redirectUrl}`;
    const attempted = sessionStorage.getItem(flagKey) === "1";

    if (attempted) {
      setDidAttempt(true);
      // go somewhere safe
      router.replace("/cart");
      return;
    }

    sessionStorage.setItem(flagKey, "1");

    // Replace so "Back" returns to this bridge instead of Woo order-pay verify page
    window.location.replace(redirectUrl);
  }, [redirectUrl, router]);

  if (!redirectUrl) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-semibold">Payment link missing</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          Please go back to your cart and try checkout again.
        </p>
        <div className="mt-5">
          <Button asChild variant="outline">
            <Link href="/cart">Back to cart</Link>
          </Button>
        </div>
      </div>
    );
  }

  // This UI is rarely seen because we immediately redirect.
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-semibold">Redirecting to payment…</h1>
      <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
        If you’re not redirected, use the button below.
      </p>

      <div className="mt-5 flex gap-2">
        <Button onClick={() => window.location.replace(redirectUrl)}>
          Continue to payment
        </Button>
        <Button asChild variant="outline">
          <Link href="/cart">Back to cart</Link>
        </Button>
      </div>

      {didAttempt ? (
        <p className="mt-3 text-xs text-[color:var(--color-muted-foreground)]">
          You returned from payment. We sent you back to your cart to avoid Woo verification screens.
        </p>
      ) : null}
    </div>
  );
}