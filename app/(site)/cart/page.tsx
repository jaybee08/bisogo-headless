"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useCart, type CartTotals } from "@/lib/cart/store";
import { CartLine } from "@/components/cart/cart-line";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/state/empty";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { Lock } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CheckoutResponse = { redirectUrl: string };

type Guest = {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string; // PH state code (e.g. "NCR", "CEB") when country=PH
  postcode: string;
  country: string; // "PH"
};

type ShippingRate = {
  rate_id: string;
  name: string;
  description?: string;
  delivery_time?: string;
  price: string; // minor units
  taxes?: string; // minor units
  instance_id: number;
  method_id: string;
  selected: boolean;
};

type ShippingPackage = {
  package_id: number;
  name?: string;
  destination?: any;
  items?: any[];
  shipping_rates: ShippingRate[];
};

type StoreCart = {
  coupons?: Array<{ code: string }>;
  totals?: {
    total_items: string; // minor units
    total_discount: string; // minor units
    total_shipping: string; // minor units
    total_tax: string; // minor units
    total_price: string; // minor units
    currency_code: string;
    currency_symbol: string;
    currency_minor_unit: number;
  };
  shipping_rates?: ShippingPackage[];
};

// ✅ Woo cart item shape (only what we need)
type QtyLimits = { min: number; max: number; step: number; editable: boolean };
type StoreCartItem = {
  key: string;
  id: number; // productId OR variationId in Store API
  quantity: number;
  quantity_limits?: {
    minimum?: number;
    maximum?: number;
    multiple_of?: number;
    editable?: boolean;
  };
};

const FREE_SHIPPING_THRESHOLD_PHP = 3000; // <- change this
const PH_STATES: Array<{ code: string; name: string }> = [
  { code: "NCR", name: "Metro Manila" },
  { code: "CAR", name: "Cordillera Region" },
  { code: "ABR", name: "Abra" },
  { code: "AGN", name: "Agusan del Norte" },
  { code: "AGS", name: "Agusan del Sur" },
  { code: "AKL", name: "Aklan" },
  { code: "ALB", name: "Albay" },
  { code: "ANT", name: "Antique" },
  { code: "APA", name: "Apayao" },
  { code: "AUR", name: "Aurora" },
  { code: "BAS", name: "Basilan" },
  { code: "BAN", name: "Bataan" },
  { code: "BTN", name: "Batanes" },
  { code: "BTG", name: "Batangas" },
  { code: "BEN", name: "Benguet" },
  { code: "BIL", name: "Biliran" },
  { code: "BOH", name: "Bohol" },
  { code: "BUK", name: "Bukidnon" },
  { code: "BUL", name: "Bulacan" },
  { code: "CAG", name: "Cagayan" },
  { code: "CAN", name: "Camarines Norte" },
  { code: "CAS", name: "Camarines Sur" },
  { code: "CAM", name: "Camiguin" },
  { code: "CAP", name: "Capiz" },
  { code: "CAT", name: "Catanduanes" },
  { code: "CAV", name: "Cavite" },
  { code: "CEB", name: "Cebu" },
  { code: "DIN", name: "Dinagat Islands" },
  { code: "EAS", name: "Eastern Samar" },
  { code: "GUI", name: "Guimaras" },
  { code: "IFU", name: "Ifugao" },
  { code: "ILN", name: "Ilocos Norte" },
  { code: "ILS", name: "Ilocos Sur" },
  { code: "ILI", name: "Iloilo" },
  { code: "ISA", name: "Isabela" },
  { code: "KAL", name: "Kalinga" },
  { code: "LUN", name: "La Union" },
  { code: "LAG", name: "Laguna" },
  { code: "LAN", name: "Lanao del Norte" },
  { code: "LAS", name: "Lanao del Sur" },
  { code: "LEY", name: "Leyte" },
  { code: "MAD", name: "Marinduque" },
  { code: "MAS", name: "Masbate" },
  { code: "MSC", name: "Misamis Occidental" },
  { code: "MSN", name: "Misamis Oriental" },
  { code: "MOU", name: "Mountain Province" },
  { code: "NEC", name: "Negros Occidental" },
  { code: "NER", name: "Negros Oriental" },
  { code: "NSA", name: "Northern Samar" },
  { code: "NUE", name: "Nueva Ecija" },
  { code: "NUV", name: "Nueva Vizcaya" },
  { code: "MDC", name: "Occidental Mindoro" },
  { code: "MDR", name: "Oriental Mindoro" },
  { code: "PLW", name: "Palawan" },
  { code: "PAM", name: "Pampanga" },
  { code: "PAN", name: "Pangasinan" },
  { code: "QUE", name: "Quezon" },
  { code: "QUI", name: "Quirino" },
  { code: "RIZ", name: "Rizal" },
  { code: "ROM", name: "Romblon" },
  { code: "WSA", name: "Samar" },
  { code: "SIG", name: "Siquijor" },
  { code: "SOR", name: "Sorsogon" },
  { code: "SCO", name: "South Cotabato" },
  { code: "SLE", name: "Southern Leyte" },
  { code: "SUN", name: "Surigao del Norte" },
  { code: "SUR", name: "Surigao del Sur" },
  { code: "TAR", name: "Tarlac" },
  { code: "TAW", name: "Tawi-Tawi" },
  { code: "ZMB", name: "Zambales" },
  { code: "ZAN", name: "Zamboanga del Norte" },
  { code: "ZAS", name: "Zamboanga del Sur" },
  { code: "ZSI", name: "Zamboanga Sibugay" },
];

function isPH(country: string) {
  return (country || "").trim().toUpperCase() === "PH";
}

function readCartToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("bisogo_cart_token") || "";
}
function writeCartToken(token: string) {
  if (typeof window === "undefined") return;
  if (!token) return;
  localStorage.setItem("bisogo_cart_token", token);
}
function clearCartToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("bisogo_cart_token");
}

function minorToNumber(minorStr: string | undefined, minorUnit: number) {
  const n = Number(minorStr || "0");
  const denom = Math.pow(10, minorUnit || 2);
  return Number.isFinite(n) ? n / denom : 0;
}

function moneyFromMinor(minorStr: string | undefined, minorUnit: number, symbol: string) {
  const v = minorToNumber(minorStr, minorUnit);
  return `${symbol}${v.toFixed(2)}`;
}

function storeTotalsToCartTotals(totals: StoreCart["totals"] | undefined): CartTotals | null {
  if (!totals) return null;
  const minor = totals.currency_minor_unit ?? 2;

  return {
    currency: totals.currency_code || "PHP",
    subtotal: minorToNumber(totals.total_items, minor),
    shipping: minorToNumber(totals.total_shipping, minor),
    discount: minorToNumber(totals.total_discount, minor),
    total: minorToNumber(totals.total_price, minor),
  };
}

function SkeletonLine({ w = "w-20" }: { w?: string }) {
  return (
    <span
      className={["inline-block h-4 rounded-md bg-[color:var(--color-muted)]", "animate-pulse", w].join(" ")}
      aria-hidden="true"
    />
  );
}

function SpinnerDot() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[color:var(--color-border)] border-t-[color:var(--color-foreground)]"
      aria-hidden="true"
    />
  );
}

/** ---------------------------
 * ✅ Woo error formatting
 * -------------------------- */
function decodeHtmlEntities(s: string) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

type WooErrorShape = { code?: string; message?: string; data?: any };

async function readWooError(res: Response) {
  const text = await res.text().catch(() => "");
  let j: WooErrorShape | null = null;

  try {
    j = text ? (JSON.parse(text) as WooErrorShape) : null;
  } catch {
    j = null;
  }

  const code = j?.code || "";
  const rawMsg = j?.message || text || "Request failed";
  const msg = decodeHtmlEntities(String(rawMsg));

  if (code === "invalid_quantity") {
    const m = msg.match(/maximum quantity of "(.+?)".+?is (\d+)/i);
    if (m) return `Max quantity for “${m[1]}” is ${m[2]}.`;
    return "That quantity isn’t available for this item.";
  }

  if (/maximum quantity/i.test(msg)) return "That quantity isn’t available for this item.";
  if (code === "rest_no_route") return "Store API route missing. Please check the proxy endpoint.";

  return msg.replace(/^Error:\s*/i, "");
}

// Safety net (should not be needed once dropdown is used)
function normalizePHState(input: string) {
  const raw = (input || "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper.includes("NCR")) return "NCR";
  if (upper.includes("METRO MANILA") || upper.includes("MANILA")) return "NCR";
  if (upper.includes("CEBU")) return "CEB";
  const letters = upper.replace(/[^A-Z]/g, "");
  if (letters.length <= 4) return letters;
  return letters.slice(0, 4);
}

function splitName(fullName: string) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || "",
    last: parts.slice(1).join(" ") || "",
  };
}

function pickFreeShippingRate(pkg?: ShippingPackage) {
  if (!pkg?.shipping_rates?.length) return null;

  // Woo typical free shipping method id
  const byMethod = pkg.shipping_rates.find((r) => r.method_id === "free_shipping");
  if (byMethod) return byMethod;

  // fallback
  return pkg.shipping_rates.find((r) => /free/i.test(r.name || "")) || null;
}

function pickDefaultPaidRate(pkg?: ShippingPackage) {
  if (!pkg?.shipping_rates?.length) return null;
  return (
    pkg.shipping_rates.find((r) => r.selected && r.method_id !== "free_shipping") ||
    pkg.shipping_rates.find((r) => r.method_id !== "free_shipping") ||
    null
  );
}

export default function CartPage() {
  const items = useCart((s) => s.items);
  const hasHydrated = useCart((s) => s.hasHydrated);
  const clear = useCart((s) => s.clear);
  const localSubtotal = useCart((s) => s.subtotal());
  const setTotals = useCart((s) => s.setTotals);

  const syncSeq = useRef(0);
  const syncAbort = useRef<AbortController | null>(null);

  const { data } = useSession();
  const isAuthed = !!data?.user;

  const [loading, setLoading] = useState(false); // checkout
  const [error, setError] = useState<string | null>(null);

  const [guest, setGuest] = useState<Guest>({
    name: data?.user?.name || "",
    email: data?.user?.email || "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postcode: "",
    country: "PH",
  });

  const [cartToken, setCartToken] = useState<string>("");
  const [storeCart, setStoreCart] = useState<StoreCart | null>(null);
  const [rates, setRates] = useState<ShippingPackage[]>([]);
  const [coupon, setCoupon] = useState("");
  const [syncing, setSyncing] = useState(false);

  const [couponLoading, setCouponLoading] = useState(false);
  const [couponBusyCode, setCouponBusyCode] = useState<string | null>(null);

  // ✅ loader for Get shipping rates
  const [ratesLoading, setRatesLoading] = useState(false);

  const [storeItems, setStoreItems] = useState<StoreCartItem[]>([]);
  const [qtyLimitsById, setQtyLimitsById] = useState<Record<number, QtyLimits>>({});

  function set<K extends keyof Guest>(k: K, v: Guest[K]) {
    setGuest((p) => ({ ...p, [k]: v }));
  }

  const itemsSignature = useMemo(() => {
    return items
      .map((i) => `${i.productId}:${i.variationId || 0}:${i.quantity}`)
      .sort()
      .join("|");
  }, [items]);

  const autoShipRef = useRef<{ lastMode?: "free" | "paid" | null }>({ lastMode: null });

  const autoShipPendingRef = useRef<{ rateId: string | null; tries: number }>({
    rateId: null,
    tries: 0,
  });

  const payload = useMemo(() => {
    return {
      items: items.map((i) => ({
        productId: i.productId,
        variationId: i.variationId,
        slug: i.slug,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        attributes: i.attributes,
      })),
      customer: isAuthed ? { name: data?.user?.name, email: data?.user?.email } : { ...guest },
    };
  }, [items, isAuthed, data?.user, guest]);

  function validateGuest() {
    if (isAuthed) return null;

    const req: Array<keyof Guest> = ["name", "email", "phone", "address1", "city", "state", "postcode", "country"];
    for (const k of req) {
      if (!String(guest[k] || "").trim()) return `Please fill in ${k}.`;
    }
    if (!/^\S+@\S+\.\S+$/.test(guest.email)) return "Please enter a valid email.";
    return null;
  }

  async function storeFetch(path: string, init?: RequestInit) {
    const token = cartToken || readCartToken();

    const res = await fetch(path, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
        ...(token ? { "x-cart-token": token } : {}),
      },
    });

    const nextToken = res.headers.get("x-cart-token") || "";
    if (nextToken) {
      writeCartToken(nextToken);
      setCartToken(nextToken);
    }

    return res;
  }

  function applyStoreCart(cj: StoreCart | null) {
    setStoreCart(cj);
    setRates(Array.isArray(cj?.shipping_rates) ? cj!.shipping_rates! : []);
    setTotals(storeTotalsToCartTotals(cj?.totals));

    const cartItems = (cj as any)?.items as StoreCartItem[] | undefined;
    const arr = Array.isArray(cartItems) ? cartItems : [];
    setStoreItems(arr);

    const nextLimits: Record<number, QtyLimits> = {};
    for (const li of arr) {
      const id = Number(li?.id);
      if (!Number.isFinite(id) || id <= 0) continue;

      const ql = li?.quantity_limits || {};
      const min = Math.max(1, Number(ql.minimum ?? 1) || 1);

      const maxRaw = Number(ql.maximum ?? 9999);
      const max = Number.isFinite(maxRaw) && maxRaw > 0 ? Math.max(min, maxRaw) : 9999;

      const step = Math.max(1, Number(ql.multiple_of ?? 1) || 1);
      const editable = Boolean(ql.editable ?? true);

      nextLimits[id] = { min, max, step, editable };
    }
    setQtyLimitsById(nextLimits);
  }

  const refreshCart = useCallback(async () => {
    const c = await storeFetch("/api/store/cart");
    if (!c.ok) throw new Error(await readWooError(c));
    const cj = (await c.json().catch(() => null)) as StoreCart | null;
    applyStoreCart(cj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartToken]);

  const syncCart = useCallback(
    async (itemsOverride?: typeof items) => {
      const snapshot = itemsOverride ?? items;

      syncAbort.current?.abort();
      const controller = new AbortController();
      syncAbort.current = controller;

      const seq = ++syncSeq.current;

      setSyncing(true);
      setError(null);

      try {
        const res = await storeFetch(
          "/api/store/cart/sync",
          {
            method: "POST",
            body: JSON.stringify({
              items: snapshot.map((i) => ({
                productId: i.productId,
                variationId: i.variationId,
                quantity: i.quantity,
              })),
            }),
            signal: controller.signal,
          } as any
        );

        if (seq !== syncSeq.current) return;

        if (!res.ok) throw new Error(await readWooError(res));

        const cj = (await res.json().catch(() => null)) as StoreCart | null;
        if (seq !== syncSeq.current) return;

        applyStoreCart(cj);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Failed to sync cart");
      } finally {
        if (seq === syncSeq.current) setSyncing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, cartToken]
  );

  async function updateCustomerForShipping() {
    if (ratesLoading) return;

    setRatesLoading(true);
    setError(null);

    try {
      const { first, last } = splitName(guest.name);

      const country = (guest.country || "PH").toUpperCase();

      // PH state must be a code from dropdown; fallback to normalize just in case
      const stateCode =
        country === "PH"
          ? ((guest.state || "").trim().toUpperCase() || normalizePHState(guest.state))
          : guest.state;

      const billing_address = {
        first_name: first,
        last_name: last,
        company: "",
        address_1: guest.address1 || "",
        address_2: guest.address2 || "",
        city: guest.city || "",
        state: stateCode || "",
        postcode: guest.postcode || "",
        country,
        phone: guest.phone || "",
        email: guest.email || "",
      };

      const shipping_address = {
        first_name: first,
        last_name: last,
        company: "",
        address_1: guest.address1 || "",
        address_2: guest.address2 || "",
        city: guest.city || "",
        state: stateCode || "",
        postcode: guest.postcode || "",
        country,
        phone: guest.phone || "",
      };

      const res = await storeFetch("/api/store/cart/update-customer", {
        method: "POST",
        body: JSON.stringify({ billing_address, shipping_address }),
      });

      if (!res.ok) throw new Error(await readWooError(res));

      await refreshCart();
    } catch (e: any) {
      setError(e?.message || "Failed to fetch shipping rates");
    } finally {
      setRatesLoading(false);
    }
  }

  async function applyCoupon() {
    if (couponLoading) return;
    setError(null);

    const code = coupon.trim();
    if (!code) return;

    setCouponLoading(true);
    setCouponBusyCode("__apply__");

    try {
      const res = await storeFetch("/api/store/cart/apply-coupon", {
        method: "POST",
        body: JSON.stringify({ code }),
      });

      if (!res.ok) throw new Error(await readWooError(res));

      await refreshCart();
      setCoupon("");
    } catch (e: any) {
      setError(e?.message || "Failed to apply coupon");
    } finally {
      setCouponBusyCode(null);
      setCouponLoading(false);
    }
  }

  async function removeCoupon(code: string) {
    if (couponLoading) return;
    setError(null);

    setCouponLoading(true);
    setCouponBusyCode(code);

    try {
      const res = await storeFetch("/api/store/cart/remove-coupon", {
        method: "POST",
        body: JSON.stringify({ code }),
      });

      if (!res.ok) throw new Error(await readWooError(res));

      await refreshCart();
    } catch (e: any) {
      setError(e?.message || "Failed to remove coupon");
    } finally {
      setCouponBusyCode(null);
      setCouponLoading(false);
    }
  }

  async function selectRate(packageId: number, rateId: string) {
    setError(null);
    try {
      const res = await storeFetch("/api/store/cart/select-shipping-rate", {
        method: "POST",
        body: JSON.stringify({ package_id: packageId, rate_id: rateId }),
      });

      if (!res.ok) throw new Error(await readWooError(res));

      await refreshCart();
    } catch (e: any) {
      setError(e?.message || "Failed to select shipping rate");
    }
  }

  useEffect(() => {
    const t = readCartToken();
    if (t) setCartToken(t);
    refreshCart().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!items.length) {
      setStoreCart(null);
      setRates([]);
      setTotals(null);
      setStoreItems([]);
      setQtyLimitsById({});
      return;
    }

    const snapshot = items;
    const t = setTimeout(() => {
      syncCart(snapshot);
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, itemsSignature]);

  useEffect(() => {
    if (!hasHydrated) return;

    let timer: any = null;

    const onChanged = () => {
      if (!items.length) return;
      if (timer) clearTimeout(timer);

      const snapshot = items;
      timer = setTimeout(() => {
        syncCart(snapshot);
      }, 120);
    };

    window.addEventListener("bisogo:cart-changed", onChanged);
    return () => {
      window.removeEventListener("bisogo:cart-changed", onChanged);
      if (timer) clearTimeout(timer);
    };
  }, [hasHydrated, items, syncCart]);

  useEffect(() => {
    // Need shipping packages + totals
    const pkg = rates?.[0];
    const totals = storeCart?.totals;
    if (!pkg || !totals) return;

    const minor = totals.currency_minor_unit ?? 2;
    const subtotalPhp = minorToNumber(totals.total_items, minor);

    const freeRate = pickFreeShippingRate(pkg);
    const paidRate = pickDefaultPaidRate(pkg);

    // If threshold reached: select free shipping (if available)
    if (subtotalPhp >= FREE_SHIPPING_THRESHOLD_PHP && freeRate) {
      // Already free selected -> nothing to do
      if (freeRate.selected) {
        autoShipRef.current.lastMode = "free";
        return;
      }

      // Guard: don’t spam reselect if we already tried and selection hasn't changed yet
      if (autoShipRef.current.lastMode === "free") return;

      autoShipRef.current.lastMode = "free";
      selectRate(pkg.package_id, freeRate.rate_id);
      return;
    }

    // OPTIONAL: if subtotal drops below threshold, auto-select a paid rate again
    // If you don’t want auto-revert, delete this entire block.
    if (subtotalPhp < FREE_SHIPPING_THRESHOLD_PHP) {
      if (!paidRate) return;

      // If already on paid rate, nothing to do
      if (paidRate.selected) {
        autoShipRef.current.lastMode = "paid";
        return;
      }

      if (autoShipRef.current.lastMode === "paid") return;

      autoShipRef.current.lastMode = "paid";
      selectRate(pkg.package_id, paidRate.rate_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates, storeCart?.totals?.total_items]);

  const storeTotals = storeCart?.totals;
  const symbol = storeTotals?.currency_symbol || "₱";
  const minor = storeTotals?.currency_minor_unit ?? 2;
  const appliedCoupons = (storeCart?.coupons || []).map((c) => c.code);

  const showSkeleton = syncing || !storeTotals;

  const onCheckout = async () => {
    if (!items.length || loading) return;

    const guestErr = validateGuest();
    if (guestErr) {
      setError(guestErr);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await updateCustomerForShipping();

      const firstPkg = rates?.[0];
      const selectedRate = firstPkg?.shipping_rates?.find((r) => r.selected) || null;

      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cart-token": cartToken || readCartToken(),
        },
        cache: "no-store",
        body: JSON.stringify({
          items: payload.items,
          customer: payload.customer,
          coupons: appliedCoupons,
          shipping: selectedRate
            ? {
                method_id: selectedRate.method_id,
                instance_id: selectedRate.instance_id,
                rate_id: selectedRate.rate_id,
                title: selectedRate.name,
                total_minor: selectedRate.price,
                currency_symbol: symbol,
                currency_minor_unit: minor,
              }
            : null,
        }),
      });

      const text = await res.text();
      let dataJson: any = null;
      try {
        dataJson = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) throw new Error((dataJson && (dataJson.error || dataJson.message)) || text || "Checkout failed");

      const out = (dataJson || {}) as CheckoutResponse;
      if (!out.redirectUrl) throw new Error("Missing redirectUrl from server.");

      // window.location.href = out.redirectUrl;
      window.location.href = `/pay?u=${encodeURIComponent(out.redirectUrl)}`;
    } catch (e: any) {
      setError(e?.message || "Checkout failed");
      setLoading(false);
    }
  };

  const fallbackSubtotalLabel = `${symbol}${(hasHydrated ? localSubtotal : 0).toFixed(2)}`;
  const lineIdFor = (i: { productId: number; variationId?: number }) => Number(i.variationId ?? i.productId);

  const totalsSig = useMemo(() => {
  const t = storeCart?.totals;
  if (!t) return "";
  return [
    t.total_items,
    t.total_discount,
    t.total_shipping,
    t.total_price,
    t.currency_minor_unit,
    t.currency_code,
  ].join("|");
}, [storeCart?.totals]);

const shipSig = useMemo(() => {
  const pkg = rates?.[0];
  if (!pkg?.shipping_rates?.length) return "";
  return pkg.shipping_rates
    .map((r) => `${r.rate_id}:${r.method_id}:${r.selected ? 1 : 0}:${r.price}`)
    .join("|");
}, [rates]);

useEffect(() => {
  const pkg = rates?.[0];
  const totals = storeCart?.totals;
  if (!pkg || !totals) return;

  const minor = totals.currency_minor_unit ?? 2;

  // Choose what threshold is based on:
  // - Usually free shipping is based on ITEMS subtotal (pre-shipping)
  const itemsSubtotalPhp = minorToNumber(totals.total_items, minor);

  const freeRate = pickFreeShippingRate(pkg);
  const paidRate = pickDefaultPaidRate(pkg);

  // If free shipping rate exists and threshold reached → prefer free
  const shouldBeFree = itemsSubtotalPhp >= FREE_SHIPPING_THRESHOLD_PHP && !!freeRate;

  const currentlySelected =
    pkg.shipping_rates.find((r) => r.selected) || null;

  // If we have a pending auto-select and it “stuck”, clear pending
  if (autoShipPendingRef.current.rateId) {
    const wanted = autoShipPendingRef.current.rateId;
    if (currentlySelected?.rate_id === wanted) {
      autoShipPendingRef.current = { rateId: null, tries: 0 };
    }
  }

  // Decide the target rate
  const target = shouldBeFree ? freeRate : paidRate;
  if (!target) return;

  // Already selected → nothing to do
  if (currentlySelected?.rate_id === target.rate_id) return;

  // Avoid infinite loops: only auto-attempt a couple times per “cycle”
  // (cycle resets once selection changes / sticks)
  const pending = autoShipPendingRef.current;
  const isSamePending = pending.rateId === target.rate_id;

  if (!isSamePending) {
    autoShipPendingRef.current = { rateId: target.rate_id, tries: 0 };
  } else if (pending.tries >= 2) {
    return;
  }

  autoShipPendingRef.current.tries += 1;

  // Fire selection (this will refreshCart() inside selectRate)
  selectRate(pkg.package_id, target.rate_id);

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [totalsSig, shipSig]);

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
            Your items are stored locally on this device.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_360px]">
        <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] divide-y divide-[color:var(--color-border)]">
          {items.length ? (
            items.map((item) => {
              const id = lineIdFor(item);
              const limits = qtyLimitsById[id];
              return <CartLine key={item.key} item={item} limits={limits} />;
            })
          ) : (
            <div className="p-6">
              <EmptyState title="Your cart is empty" description="Add products from the shop to begin." />
            </div>
          )}
        </div>

        <aside className="h-fit rounded-[var(--radius)] border border-[color:var(--color-border)] p-5">
          <div className="text-sm font-semibold">Order summary</div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--color-muted-foreground)]">Subtotal</span>
              <span className="font-medium tabular-nums">
                {showSkeleton ? (
                  <SkeletonLine w="w-24" />
                ) : storeTotals ? (
                  moneyFromMinor(storeTotals.total_items, minor, symbol)
                ) : (
                  fallbackSubtotalLabel
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[color:var(--color-muted-foreground)]">Discount</span>
              <span className="font-medium tabular-nums">
                {showSkeleton ? (
                  <SkeletonLine w="w-20" />
                ) : storeTotals && Number(storeTotals.total_discount || "0") > 0 ? (
                  <>-{moneyFromMinor(storeTotals.total_discount, minor, symbol)}</>
                ) : (
                  "—"
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[color:var(--color-muted-foreground)]">Shipping</span>
              <span className="font-medium tabular-nums">
                {showSkeleton ? (
                  <SkeletonLine w="w-20" />
                ) : storeTotals ? (
                  moneyFromMinor(storeTotals.total_shipping, minor, symbol)
                ) : (
                  "—"
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[color:var(--color-muted-foreground)]">Tax</span>
              <span className="font-medium tabular-nums">
                {showSkeleton ? (
                  <SkeletonLine w="w-16" />
                ) : storeTotals && Number(storeTotals.total_tax || "0") > 0 ? (
                  moneyFromMinor(storeTotals.total_tax, minor, symbol)
                ) : (
                  "—"
                )}
              </span>
            </div>

            <div className="pt-2 border-t border-[color:var(--color-border)] flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-semibold tabular-nums">
                {showSkeleton ? (
                  <SkeletonLine w="w-28" />
                ) : storeTotals ? (
                  moneyFromMinor(storeTotals.total_price, minor, symbol)
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>

          {/* Coupon */}
          <div className="mt-5 space-y-2">
            <div className="text-sm font-semibold">Coupon</div>

            {appliedCoupons.length ? (
              <div className="space-y-2">
                {appliedCoupons.map((c) => {
                  const removingThis = couponLoading && couponBusyCode === c;
                  return (
                    <div
                      key={c}
                      className="flex items-center justify-between rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{c}</span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-xs underline underline-offset-4 disabled:opacity-60"
                        onClick={() => removeCoupon(c)}
                        disabled={couponLoading}
                        aria-busy={removingThis}
                      >
                        {removingThis ? (
                          <>
                            <SpinnerDot />
                            Removing…
                          </>
                        ) : (
                          "Remove"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  disabled={couponLoading}
                />
                <Button type="button" variant="outline" onClick={applyCoupon} disabled={couponLoading || !coupon.trim()}>
                  {couponLoading && couponBusyCode === "__apply__" ? (
                    <span className="inline-flex items-center gap-2">
                      <SpinnerDot />
                      Applying…
                    </span>
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Shipping */}
          <div className="mt-5 space-y-3">
            <div className="text-sm font-semibold">Shipping</div>

            {!isAuthed ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="City"
                    value={guest.city}
                    onChange={(e) => set("city", e.target.value)}
                    disabled={ratesLoading}
                  />

                  {isPH(guest.country) ? (
                    <Select
                      value={guest.state}
                      onValueChange={(v) => set("state", v)}
                      disabled={ratesLoading}
                    >
                      <SelectTrigger className="h-10 text-base sm:text-sm">
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[280px]">
                        {PH_STATES.map((s) => (
                          <SelectItem key={s.code} value={s.code}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="State/Province"
                      value={guest.state}
                      onChange={(e) => set("state", e.target.value)}
                      disabled={ratesLoading}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Postal code"
                    value={guest.postcode}
                    onChange={(e) => set("postcode", e.target.value)}
                    disabled={ratesLoading}
                  />
                  <Input
                    placeholder="Country (PH)"
                    value={guest.country}
                    onChange={(e) => set("country", e.target.value)}
                    disabled={ratesLoading}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={updateCustomerForShipping}
                  disabled={ratesLoading}
                >
                  {ratesLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <SpinnerDot />
                      Getting rates…
                    </span>
                  ) : (
                    "Get shipping rates"
                  )}
                </Button>
              </>
            ) : (
              <div className="text-xs text-[color:var(--color-muted-foreground)]">
                Add/update your shipping details at checkout if needed.
              </div>
            )}

            {rates?.[0]?.shipping_rates?.length ? (
              <div className="space-y-2">
                {rates[0].shipping_rates.map((r) => (
                  <label
                    key={r.rate_id}
                    className="flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-[color:var(--color-border)] p-3"
                  >
                    <input
                      type="radio"
                      name="shiprate"
                      className="mt-1"
                      checked={!!r.selected}
                      onChange={() => selectRate(rates[0].package_id, r.rate_id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{r.name}</div>
                        <div className="font-medium">{moneyFromMinor(r.price, minor, symbol)}</div>
                      </div>
                      {r.delivery_time ? (
                        <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">{r.delivery_time}</div>
                      ) : null}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[color:var(--color-muted-foreground)]">
                Enter your address to see available shipping methods.
              </div>
            )}
          </div>

          {!isAuthed ? (
            <div className="mt-5 space-y-3">
              <div className="text-sm font-semibold">Guest details</div>

              <Input placeholder="Full name" value={guest.name} onChange={(e) => set("name", e.target.value)} />
              <Input placeholder="Email" value={guest.email} onChange={(e) => set("email", e.target.value)} />
              <Input placeholder="Phone" value={guest.phone} onChange={(e) => set("phone", e.target.value)} />

              <Input placeholder="Address line 1" value={guest.address1} onChange={(e) => set("address1", e.target.value)} />
              <Input placeholder="Address line 2 (optional)" value={guest.address2} onChange={(e) => set("address2", e.target.value)} />
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-[calc(var(--radius)-4px)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-5 space-y-2">
            <Button className="w-full" onClick={onCheckout} disabled={!items.length || loading}>
              {loading ? "Creating order…" : "Checkout"}
            </Button>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                clear();
                clearCartToken();
                setStoreCart(null);
                setStoreItems([]);
                setQtyLimitsById({});
                setRates([]);
                setTotals(null);
              }}
              disabled={!items.length || loading}
            >
              Clear cart
            </Button>
          </div>

          <div className="mt-5 space-y-2 text-sm text-[color:var(--color-muted-foreground)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-white/60 px-3 py-1">
              <Lock className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium text-foreground/80">Secure checkout by Bisogo</span>
            </div>

            <p className="text-xs">Totals update here (coupon + shipping) before you checkout.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}