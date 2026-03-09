import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CityRow = {
  cityId: number;
  city: string;
  state: string;
  citySlug: string;
  stateSlug: string;
};

type StateRow = {
  state: string;
  stateSlug: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ✅ Type guard: removes nulls AND informs TS
function notNull<T>(v: T | null): v is T {
  return v !== null;
}

export async function GET() {
  const base = process.env.CMS_DATA_BASE_URL;
  if (!base) return NextResponse.json({ error: "Missing CMS_DATA_BASE_URL" }, { status: 500 });

  const res = await fetch(`${base}/agoda-ph-cities.json`, { next: { revalidate: 86400 } });
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch cities" }, { status: 502 });

  const raw = await res.json();

  // raw from CSV script: [{ cityId, city, state, ... }]
  const cities: CityRow[] = (Array.isArray(raw) ? raw : [])
    .map((c: any): CityRow | null => {
      const city = (c.city || c.name || "").toString().trim();
      const state = (c.state || "").toString().trim() || "Unknown";
      const cityId = Number(c.cityId);

      if (!city || !Number.isFinite(cityId) || cityId <= 0) return null;

      return {
        cityId,
        city,
        state,
        citySlug: slugify(city),
        stateSlug: slugify(state),
      };
    })
    .filter(notNull)
    .sort((a, b) => a.city.localeCompare(b.city, "en"));

  // Build states list from cities
  const statesSet = new Map<string, StateRow>();
  for (const c of cities) {
    const key = c.stateSlug;
    if (!statesSet.has(key)) statesSet.set(key, { state: c.state, stateSlug: key });
  }
  const states = Array.from(statesSet.values()).sort((a, b) =>
    a.state.localeCompare(b.state, "en")
  );

  return NextResponse.json({ states, cities });
}