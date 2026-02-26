// components/account/account-profile.tsx
import { auth } from "@/lib/auth/auth";
import { getWooCustomerById } from "@/lib/woo/customer";
import { AccountProfileClient } from "./account-profile-client";

export async function AccountProfile() {
  const session = await auth();
  const wooCustomerId = Number((session?.user as any)?.wooCustomerId || 0);

  if (!session?.user) return null;

  if (!wooCustomerId) {
    return (
      <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-muted)] p-4 text-sm">
        <div className="font-medium">We’re still syncing your account.</div>
        <div className="mt-1 text-[color:var(--color-muted-foreground)]">
          Please refresh in a moment. If this persists, WooCommerce may be temporarily unavailable.
        </div>
      </div>
    );
  }

  const customer = await getWooCustomerById(wooCustomerId);

  return (
    <AccountProfileClient
      initial={{
        first_name: customer.first_name || "",
        last_name: customer.last_name || "",
        email: customer.email || session.user.email || "",
        billing: customer.billing || {},
        shipping: customer.shipping || {},
      }}
    />
  );
}