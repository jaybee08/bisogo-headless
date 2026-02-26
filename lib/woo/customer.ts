// lib/woo/customer.ts
import { wooFetch } from "@/lib/woo/rest";

export type WooCustomer = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    email?: string;
    phone?: string;
  };
  shipping?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

function splitName(fullName?: string | null) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") || "" };
}

export async function getWooCustomerByEmail(email: string) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean) return null;

  const existing = await wooFetch<WooCustomer[]>(
    `/customers?email=${encodeURIComponent(clean)}`
  );
  return existing?.[0] || null;
}

export async function createWooCustomer(input: { email: string; name?: string | null }) {
  const email = String(input.email || "").trim().toLowerCase();
  if (!email) throw new Error("Email is required");

  const { first, last } = splitName(input.name);

  // username is optional; Woo may auto-generate.
  // Avoid password/role for headless SSO – fewer compatibility issues.
  const payload: any = {
    email,
    first_name: first || undefined,
    last_name: last || undefined,
  };

  return await wooFetch<WooCustomer>(`/customers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function ensureWooCustomer(input: { email: string; name?: string | null }) {
  const email = String(input.email || "").trim().toLowerCase();
  if (!email) throw new Error("Email is required");

  // 1) try find by email
  const existing = await getWooCustomerByEmail(email);
  if (existing?.id) return existing;

  // 2) create
  try {
    return await createWooCustomer({ email, name: input.name });
  } catch (e: any) {
    // race condition safety
    const retry = await getWooCustomerByEmail(email);
    if (retry?.id) return retry;
    throw e;
  }
}

// ✅ Backwards compatible helper (same intent as your old function)
export async function getOrCreateWooCustomerId(input: { email: string; name?: string | null }) {
  const c = await ensureWooCustomer(input);
  return c.id;
}

// ✅ For your Account page (read + update addresses)
export async function getWooCustomerById(id: number) {
  const cid = Number(id);
  if (!Number.isFinite(cid) || cid <= 0) throw new Error("Invalid Woo customer id");
  return await wooFetch<WooCustomer>(`/customers/${cid}`);
}

export async function updateWooCustomer(id: number, payload: Partial<WooCustomer>) {
  const cid = Number(id);
  if (!Number.isFinite(cid) || cid <= 0) throw new Error("Invalid Woo customer id");

  // only send safe fields you actually plan to update
  const safe: any = {};
  if (payload.first_name != null) safe.first_name = payload.first_name;
  if (payload.last_name != null) safe.last_name = payload.last_name;
  if (payload.billing != null) safe.billing = payload.billing;
  if (payload.shipping != null) safe.shipping = payload.shipping;

  return await wooFetch<WooCustomer>(`/customers/${cid}`, {
    method: "PUT",
    body: JSON.stringify(safe),
  });
}