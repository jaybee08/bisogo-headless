import { wooFetch } from "@/lib/woo/rest";
import { randomUUID } from "crypto";


type WooCustomer = { id: number; email: string };

export async function getOrCreateWooCustomer(input: { email: string; name?: string | null }) {
  const email = (input.email || "").trim().toLowerCase();
  if (!email) throw new Error("Email is required");

  // 1) Try find customer by email
  const existing = await wooFetch<WooCustomer[]>(
    `/customers?email=${encodeURIComponent(email)}`
  );

  if (existing?.[0]?.id) return existing[0].id;

  // 2) Create new customer
  const name = (input.name || "").trim();
  const first_name = name.split(" ")[0] || "";
  const last_name = name.split(" ").slice(1).join(" ") || "";

  try {
    const created = await wooFetch<{ id: number }>(`/customers`, {
      method: "POST",
      body: JSON.stringify({
        email,
        first_name,
        last_name,
        role: "customer",
        password: randomUUID(),
      }),
    });
    return created.id;
  } catch (e: any) {
    // If a race condition happens (or Woo says "email already registered"),
    // re-fetch by email once and return it.
    const retry = await wooFetch<WooCustomer[]>(
      `/customers?email=${encodeURIComponent(email)}`
    );
    if (retry?.[0]?.id) return retry[0].id;
    throw e;
  }
}