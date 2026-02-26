// components/account/account-profile-client.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getPHProvinces, getPHCities, getPHZipcodes } from "@/lib/ph-locations";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Addr = {
  first_name?: string;
  last_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string; // PH province code (e.g. "CEB")
  postcode?: string;
  country?: string; // "PH"
  phone?: string;
  email?: string;
};

type Props = {
  initial: {
    first_name: string;
    last_name: string;
    email: string;
    billing: Addr;
    shipping: Addr;
  };
};

function isPH(country?: string) {
  return String(country || "PH").trim().toUpperCase() === "PH";
}

export function AccountProfileClient({ initial }: Props) {
  const [isPending, startTransition] = useTransition();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [sameAsBilling, setSameAsBilling] = useState(false);

  // Top-level
  const [firstName, setFirstName] = useState(initial.first_name);
  const [lastName, setLastName] = useState(initial.last_name);

  // Billing fields
  const [bill, setBill] = useState<Addr>({
    first_name: initial.billing.first_name || initial.first_name || "",
    last_name: initial.billing.last_name || initial.last_name || "",
    email: initial.billing.email || initial.email || "",
    phone: initial.billing.phone || "",
    address_1: initial.billing.address_1 || "",
    address_2: initial.billing.address_2 || "",
    city: initial.billing.city || "",
    state: initial.billing.state || "",
    postcode: initial.billing.postcode || "",
    country: initial.billing.country || "PH",
  });

  // Shipping fields
  const [ship, setShip] = useState<Addr>({
    first_name: initial.shipping.first_name || initial.first_name || "",
    last_name: initial.shipping.last_name || initial.last_name || "",
    address_1: initial.shipping.address_1 || "",
    address_2: initial.shipping.address_2 || "",
    city: initial.shipping.city || "",
    state: initial.shipping.state || "",
    postcode: initial.shipping.postcode || "",
    country: initial.shipping.country || "PH",
  });

  const provinces = useMemo(() => getPHProvinces(), []);

  // Billing dependent lists
  const billCities = useMemo(() => (isPH(bill.country) ? getPHCities(bill.state || "") : []), [bill.country, bill.state]);
  const billZips = useMemo(() => (isPH(bill.country) ? getPHZipcodes(bill.state || "", bill.city || "") : []), [bill.country, bill.state, bill.city]);

  // Shipping dependent lists
  const shipCities = useMemo(() => (isPH(ship.country) ? getPHCities(ship.state || "") : []), [ship.country, ship.state]);
  const shipZips = useMemo(() => (isPH(ship.country) ? getPHZipcodes(ship.state || "", ship.city || "") : []), [ship.country, ship.state, ship.city]);

  // Reset billing city/zip when province changes
  useEffect(() => {
    if (!isPH(bill.country)) return;
    setBill((p) => ({ ...p, city: "", postcode: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill.state]);

  // Auto-fill billing zip when only 1 option
  useEffect(() => {
    if (!isPH(bill.country)) return;
    if (billZips.length === 1) setBill((p) => ({ ...p, postcode: billZips[0] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill.city, bill.state]);

  // Reset shipping city/zip when province changes
  useEffect(() => {
    if (!isPH(ship.country)) return;
    setShip((p) => ({ ...p, city: "", postcode: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ship.state]);

  // Auto-fill shipping zip when only 1 option
  useEffect(() => {
    if (!isPH(ship.country)) return;
    if (shipZips.length === 1) setShip((p) => ({ ...p, postcode: shipZips[0] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ship.city, ship.state]);

  // Copy billing -> shipping when toggled
  useEffect(() => {
    if (!sameAsBilling) return;
    setShip((p) => ({
      ...p,
      first_name: bill.first_name,
      last_name: bill.last_name,
      address_1: bill.address_1,
      address_2: bill.address_2,
      city: bill.city,
      state: bill.state,
      postcode: bill.postcode,
      country: bill.country,
    }));
  }, [sameAsBilling, bill]);

  function fieldRow(label: string, children: React.ReactNode) {
    return (
      <div>
        <div className="mb-1 text-xs font-medium text-[color:var(--color-muted-foreground)]">{label}</div>
        {children}
      </div>
    );
  }

  function validate(): string | null {
    if (!firstName.trim() || !lastName.trim()) return "Please fill in your first and last name.";
    if (!String(bill.email || "").trim()) return "Please add a billing email.";
    if (!String(bill.phone || "").trim()) return "Please add a billing phone.";
    if (!String(bill.address_1 || "").trim()) return "Please add a billing address.";
    if (!String(bill.state || "").trim()) return "Please select a billing province.";
    if (!String(bill.city || "").trim()) return "Please select a billing city.";
    if (!String(bill.postcode || "").trim()) return "Please select a billing ZIP.";

    if (!sameAsBilling) {
      if (!String(ship.address_1 || "").trim()) return "Please add a shipping address.";
      if (!String(ship.state || "").trim()) return "Please select a shipping province.";
      if (!String(ship.city || "").trim()) return "Please select a shipping city.";
      if (!String(ship.postcode || "").trim()) return "Please select a shipping ZIP.";
    }
    return null;
  }

  async function onSave() {
    setSavedMsg(null);
    setErrMsg(null);

    const v = validate();
    if (v) {
      setErrMsg(v);
      return;
    }

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      billing: {
        ...bill,
        country: (bill.country || "PH").toUpperCase(),
        state: (bill.state || "").toUpperCase(),
      },
      shipping: {
        ...(sameAsBilling ? bill : ship),
        country: ((sameAsBilling ? bill.country : ship.country) || "PH").toUpperCase(),
        state: ((sameAsBilling ? bill.state : ship.state) || "").toUpperCase(),
      },
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/account/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        let j: any = null;
        try { j = text ? JSON.parse(text) : null; } catch {}

        if (!res.ok) throw new Error(j?.error || j?.message || text || "Save failed.");

        setSavedMsg("Saved!");
      } catch (e: any) {
        setErrMsg(e?.message || "Save failed.");
      }
    });
  }

  return (
    <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-5">
      <div className="text-sm font-semibold">Profile</div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {fieldRow("First name", (
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        ))}
        {fieldRow("Last name", (
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        ))}
      </div>

      {/* BILLING */}
      <div className="mt-6 text-sm font-semibold">Billing</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {fieldRow("Email", (
          <Input value={bill.email || ""} onChange={(e) => setBill((p) => ({ ...p, email: e.target.value }))} />
        ))}
        {fieldRow("Phone", (
          <Input value={bill.phone || ""} onChange={(e) => setBill((p) => ({ ...p, phone: e.target.value }))} />
        ))}

        {fieldRow("Address line 1", (
          <Input
            className="sm:col-span-2"
            value={bill.address_1 || ""}
            onChange={(e) => setBill((p) => ({ ...p, address_1: e.target.value }))}
          />
        ))}
        {fieldRow("Address line 2", (
          <Input
            className="sm:col-span-2"
            value={bill.address_2 || ""}
            onChange={(e) => setBill((p) => ({ ...p, address_2: e.target.value }))}
          />
        ))}

        {/* Province FIRST */}
        {fieldRow("Province", (
          <Select
            value={bill.state || ""}
            onValueChange={(v) => setBill((p) => ({ ...p, state: v }))}
          >
            <SelectTrigger className="h-10 text-base sm:text-sm">
              <SelectValue placeholder="Select province" />
            </SelectTrigger>
            <SelectContent className="max-h-[280px]">
              {provinces.map((p) => (
                <SelectItem key={`${p.code}-${p.name}`} value={p.code}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* City */}
        {fieldRow("City / Municipality", (
          <Select
            value={bill.city || ""}
            onValueChange={(v) => setBill((p) => ({ ...p, city: v }))}
            disabled={!bill.state}
          >
            <SelectTrigger className="h-10 text-base sm:text-sm">
              <SelectValue placeholder={bill.state ? "Select city/municipality" : "Select province first"} />
            </SelectTrigger>
            <SelectContent className="max-h-[280px]">
              {billCities.map((c) => (
                <SelectItem key={`${bill.state}-${c.name}`} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* ZIP */}
        {fieldRow("ZIP", (
          billZips.length ? (
            <Select
              value={bill.postcode || ""}
              onValueChange={(v) => setBill((p) => ({ ...p, postcode: v }))}
              disabled={!bill.city}
            >
              <SelectTrigger className="h-10 text-base sm:text-sm">
                <SelectValue placeholder="Select ZIP" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {billZips.map((z) => (
                  <SelectItem key={`${bill.state}-${bill.city}-${z}`} value={z}>
                    {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={bill.postcode || ""}
              onChange={(e) => setBill((p) => ({ ...p, postcode: e.target.value }))}
              disabled={!bill.city}
              inputMode="numeric"
            />
          )
        ))}

        {fieldRow("Country", (
          <Input value={bill.country || "PH"} onChange={(e) => setBill((p) => ({ ...p, country: e.target.value }))} />
        ))}
      </div>

      {/* SHIPPING */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Shipping</div>

        <label className="inline-flex items-center gap-2 text-xs text-[color:var(--color-muted-foreground)]">
          <input
            type="checkbox"
            checked={sameAsBilling}
            onChange={(e) => setSameAsBilling(e.target.checked)}
          />
          Same as billing
        </label>
      </div>

      <div className={cn("mt-3 grid gap-3 sm:grid-cols-2", sameAsBilling && "opacity-50 pointer-events-none")}>
        {fieldRow("Address line 1", (
          <Input
            className="sm:col-span-2"
            value={ship.address_1 || ""}
            onChange={(e) => setShip((p) => ({ ...p, address_1: e.target.value }))}
          />
        ))}
        {fieldRow("Address line 2", (
          <Input
            className="sm:col-span-2"
            value={ship.address_2 || ""}
            onChange={(e) => setShip((p) => ({ ...p, address_2: e.target.value }))}
          />
        ))}

        {/* Province FIRST */}
        {fieldRow("Province", (
          <Select
            value={ship.state || ""}
            onValueChange={(v) => setShip((p) => ({ ...p, state: v }))}
          >
            <SelectTrigger className="h-10 text-base sm:text-sm">
              <SelectValue placeholder="Select province" />
            </SelectTrigger>
            <SelectContent className="max-h-[280px]">
              {provinces.map((p) => (
                <SelectItem key={`ship-${p.code}-${p.name}`} value={p.code}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* City */}
        {fieldRow("City / Municipality", (
          <Select
            value={ship.city || ""}
            onValueChange={(v) => setShip((p) => ({ ...p, city: v }))}
            disabled={!ship.state}
          >
            <SelectTrigger className="h-10 text-base sm:text-sm">
              <SelectValue placeholder={ship.state ? "Select city/municipality" : "Select province first"} />
            </SelectTrigger>
            <SelectContent className="max-h-[280px]">
              {shipCities.map((c) => (
                <SelectItem key={`ship-${ship.state}-${c.name}`} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* ZIP */}
        {fieldRow("ZIP", (
          shipZips.length ? (
            <Select
              value={ship.postcode || ""}
              onValueChange={(v) => setShip((p) => ({ ...p, postcode: v }))}
              disabled={!ship.city}
            >
              <SelectTrigger className="h-10 text-base sm:text-sm">
                <SelectValue placeholder="Select ZIP" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {shipZips.map((z) => (
                  <SelectItem key={`ship-${ship.state}-${ship.city}-${z}`} value={z}>
                    {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={ship.postcode || ""}
              onChange={(e) => setShip((p) => ({ ...p, postcode: e.target.value }))}
              disabled={!ship.city}
              inputMode="numeric"
            />
          )
        ))}

        {fieldRow("Country", (
          <Input value={ship.country || "PH"} onChange={(e) => setShip((p) => ({ ...p, country: e.target.value }))} />
        ))}
      </div>

      {/* Messages */}
      {errMsg ? (
        <div className="mt-4 rounded-[calc(var(--radius)-4px)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {errMsg}
        </div>
      ) : null}

      {savedMsg ? (
        <div className="mt-4 rounded-[calc(var(--radius)-4px)] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {savedMsg}
        </div>
      ) : null}

      <div className="mt-5 flex justify-end">
        <Button onClick={onSave} disabled={isPending} className="rounded-full">
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}