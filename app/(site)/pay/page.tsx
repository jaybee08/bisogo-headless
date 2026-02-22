// app/(site)/pay/page.tsx
import { Suspense } from "react";
import PayBridgeClient from "./pay-bridge-client";

export const dynamic = "force-dynamic"; // avoid static prerender for this route

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-10">
          <h1 className="text-2xl font-semibold">Redirecting to payment…</h1>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
            Please wait a moment.
          </p>
        </div>
      }
    >
      <PayBridgeClient />
    </Suspense>
  );
}