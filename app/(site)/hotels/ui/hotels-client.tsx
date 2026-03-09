"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";

import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Props = {
  // fallback (your current 4 cities) while API loads
  cities: { slug: string; name: string; cityId: number }[];
};

type AgodaState = {
  state: string;
  stateSlug: string;
};

type AgodaCityRow = {
  cityId: number;
  city: string;
  state: string;
  citySlug: string;
  stateSlug: string;
};

type Hotel = {
  cityId?: number;
  hotelId: number;
  name: string;
  starRating: number;
  reviewScore: number;
  reviewCount: number;
  currency: string;
  dailyRate: number;
  crossedOutRate: number;
  discountPercentage: number;
  image: string;
  landingUrl: string;
  includeBreakfast: boolean;
  freeWifi: boolean;
  latitude: number;
  longitude: number;
  photos?: string[];
};

const ALL_VALUE = "all-top";
const INITIAL_LIMIT = 21;
const LOAD_MORE_STEP = 20;

function isoDatePlusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatPHP(n: number) {
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function siteUrl() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function HotelCardCarousel({
  fallbackImage,
  photos,
  alt,
}: {
  fallbackImage?: string;
  photos?: string[];
  alt: string;
}) {
  const imgsRaw = (photos && photos.length > 0 ? photos : fallbackImage ? [fallbackImage] : []) as string[];

  // Request bigger size when possible
  const imgs = imgsRaw.map((src) => {
    try {
      const u = new URL(src);
      u.searchParams.set("s", "800x600");
      return u.toString();
    } catch {
      return src;
    }
  });

  const [i, setI] = useState(0);
  useEffect(() => setI(0), [imgs.join("|")]);

  if (imgs.length === 0) return <div className="aspect-square w-full bg-neutral-100" />;

  const prev = () => setI((p) => (p - 1 + imgs.length) % imgs.length);
  const next = () => setI((p) => (p + 1) % imgs.length);

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgs[i]} alt={alt} className="h-full w-full object-cover" loading="lazy" />

      {imgs.length > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-1 text-xs shadow hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-1 text-xs shadow hover:bg-white"
          >
            ›
          </button>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {imgs.slice(0, 5).map((_, idx) => (
              <span
                key={idx}
                className={cn("h-1.5 w-1.5 rounded-full", idx === i ? "bg-white" : "bg-white/50")}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function HotelsClient({ cities: fallbackCities }: Props) {
  const router = useRouter();

  const [states, setStates] = useState<AgodaState[]>([]);
  const [allCities, setAllCities] = useState<AgodaCityRow[]>([]);

  // ALL_VALUE or "city"
  const [destinationMode, setDestinationMode] = useState<string>(ALL_VALUE);

  const [stateSlug, setStateSlug] = useState<string>("");
  const [cityId, setCityId] = useState<number | null>(null);

  const [stateOpen, setStateOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const [checkIn, setCheckIn] = useState<string>(isoDatePlusDays(7));
  const [checkOut, setCheckOut] = useState<string>(isoDatePlusDays(9));
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [error, setError] = useState<string>("");

  const [limit, setLimit] = useState<number>(INITIAL_LIMIT);

  // pagination/availability from API (only for ALL_VALUE)
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | null>(null);

  // Create-shortlink button loading per hotel
  const [creating, setCreating] = useState<Record<number, boolean>>({});

  // ---------------------------
  // Filters (client-side)
  // ---------------------------
  const [priceMin, setPriceMin] = useState<number | "">("");
  const [priceMax, setPriceMax] = useState<number | "">("");
  const [minScore, setMinScore] = useState<number>(0);
  const [onlyWifi, setOnlyWifi] = useState(false);
  const [onlyBreakfast, setOnlyBreakfast] = useState(false);
  const [starSet, setStarSet] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<"priceAsc" | "priceDesc" | "scoreDesc" | "reviewsDesc">("priceAsc");

  // Load states + cities from API
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/agoda/cities");
        if (!res.ok) return;
        const json = await res.json();

        const st: AgodaState[] = Array.isArray(json?.states) ? json.states : [];
        const ct: AgodaCityRow[] = Array.isArray(json?.cities) ? json.cities : [];

        if (!cancelled) {
          setStates(st);
          setAllCities(ct);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCities = useMemo(() => {
    if (!stateSlug) return [];
    return allCities
      .filter((c) => c.stateSlug === stateSlug)
      .sort((a, b) => a.city.localeCompare(b.city, "en"));
  }, [allCities, stateSlug]);

  const selectedStateLabel = useMemo(() => {
    if (!stateSlug) return "Select province";
    return states.find((s) => s.stateSlug === stateSlug)?.state ?? "Select province";
  }, [states, stateSlug]);

  const selectedCityRow = useMemo(() => {
    if (!cityId) return null;
    return allCities.find((c) => c.cityId === cityId) ?? null;
  }, [allCities, cityId]);

  const destinationLabel = useMemo(() => {
    if (destinationMode === ALL_VALUE) return "All (Top Cities)";
    if (!selectedCityRow) return "Select city";
    return selectedCityRow.city;
  }, [destinationMode, selectedCityRow]);

  const getCitySlugForDetails = useCallback(
    (hotelCityId: number) => {
      const fromCsv = allCities.find((c) => c.cityId === hotelCityId)?.citySlug;
      if (fromCsv) return fromCsv;

      const fallback = fallbackCities.find((c) => c.cityId === hotelCityId)?.slug;
      if (fallback) return fallback;

      return "city";
    },
    [allCities, fallbackCities]
  );

  async function fetchPhotosForHotels(items: Hotel[]) {
    const byCity = new Map<number, number[]>();
    for (const h of items) {
      if (!h.cityId || !h.hotelId) continue;
      const arr = byCity.get(h.cityId) ?? [];
      arr.push(h.hotelId);
      byCity.set(h.cityId, arr);
    }

    const photoMap: Record<string, string[]> = {};

    for (const [cId, ids] of byCity.entries()) {
      for (const batch of chunk(ids, 50)) {
        const qs = new URLSearchParams({
          cityId: String(cId),
          hotelIds: batch.join(","),
        });

        const res = await fetch(`/api/agoda/photos?${qs.toString()}`);
        if (!res.ok) continue;

        const json = await res.json();
        const photos = json?.photos ?? {};
        for (const [hid, arr] of Object.entries(photos)) {
          photoMap[hid] = Array.isArray(arr) ? (arr as string[]) : [];
        }
      }
    }

    setHotels((prev) =>
      prev.map((h) => ({
        ...h,
        photos: photoMap[String(h.hotelId)] ?? h.photos,
      }))
    );
  }

  async function search(nextLimit?: number) {
    setLoading(true);
    setError("");

    try {
      if (!checkIn || !checkOut) throw new Error("Please select check-in and check-out dates.");
      if (checkOut <= checkIn) throw new Error("Check-out must be after check-in.");
      if (destinationMode !== ALL_VALUE && !cityId) throw new Error("Please select a city.");

      const baseQs = new URLSearchParams({
        checkIn,
        checkOut,
        adults: String(adults),
        children: String(children),
      });

      let res: Response;

      if (destinationMode === ALL_VALUE) {
        const useLimit = typeof nextLimit === "number" ? nextLimit : limit;
        baseQs.set("limit", String(useLimit));
        res = await fetch(`/api/agoda/search-multi?${baseQs.toString()}`);
      } else {
        baseQs.set("cityId", String(cityId));
        baseQs.set("maxResult", "50");
        res = await fetch(`/api/agoda/search?${baseQs.toString()}`);
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json?.details || json?.error || json?.message || "Search failed");

      const items: Hotel[] = (json.hotels || []).map((h: any) => ({
        ...h,
        photos: [],
      }));

      setHotels(items);
      await fetchPhotosForHotels(items);

      if (destinationMode === ALL_VALUE) {
        const apiHasMore = Boolean(json?.meta?.hasMore);
        const apiTotal = typeof json?.meta?.total === "number" ? json.meta.total : null;
        setHasMore(apiHasMore);
        setTotal(apiTotal);
      } else {
        setHasMore(false);
        setTotal(null);
      }

      // reset filters
      setPriceMin("");
      setPriceMax("");
      setMinScore(0);
      setOnlyWifi(false);
      setOnlyBreakfast(false);
      setStarSet(new Set());
      setSortBy("priceAsc");
    } catch (e: any) {
      setHotels([]);
      setHasMore(false);
      setTotal(null);
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (destinationMode !== ALL_VALUE) return;
    if (!hasMore) return;

    const next = limit + LOAD_MORE_STEP;

    setLoadingMore(true);
    try {
      setLimit(next);
      await search(next);
    } finally {
      setLoadingMore(false);
    }
  }

  // Auto-search when mode/city changes
  useEffect(() => {
    setLimit(INITIAL_LIMIT);
    setHasMore(true);
    setTotal(null);
    search(INITIAL_LIMIT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationMode, cityId]);

  // Derived filtered list
  const filteredHotels = useMemo(() => {
    let list = [...hotels];

    if (priceMin !== "") list = list.filter((h) => Number(h.dailyRate) >= Number(priceMin));
    if (priceMax !== "") list = list.filter((h) => Number(h.dailyRate) <= Number(priceMax));

    if (minScore > 0) list = list.filter((h) => Number(h.reviewScore || 0) >= minScore);

    if (onlyWifi) list = list.filter((h) => !!h.freeWifi);
    if (onlyBreakfast) list = list.filter((h) => !!h.includeBreakfast);

    if (starSet.size > 0) {
      list = list.filter((h) => {
        const s = Math.round(Number(h.starRating || 0));
        return starSet.has(s);
      });
    }

    list.sort((a, b) => {
      const ap = Number(a.dailyRate ?? 1e15);
      const bp = Number(b.dailyRate ?? 1e15);
      const as = Number(a.reviewScore ?? 0);
      const bs = Number(b.reviewScore ?? 0);
      const ar = Number(a.reviewCount ?? 0);
      const br = Number(b.reviewCount ?? 0);

      switch (sortBy) {
        case "priceDesc":
          return bp - ap;
        case "scoreDesc":
          return bs - as;
        case "reviewsDesc":
          return br - ar;
        default:
          return ap - bp;
      }
    });

    return list;
  }, [hotels, priceMin, priceMax, minScore, onlyWifi, onlyBreakfast, starSet, sortBy]);

  // ✅ Shortlink navigation (pretty URL)
  async function goToDetails(h: Hotel, citySlug: string) {
    if (!h.cityId) return;

    const hotelSlug = `${slugify(h.name)}-${h.hotelId}`;

    setCreating((p) => ({ ...p, [h.hotelId]: true }));
    try {
      const payload = {
        // ✅ include these so Details page can always resolve cityId/hotelId from payload
        hotelId: h.hotelId,
        cityId: h.cityId,

        checkIn,
        checkOut,
        adults,
        children,
        name: h.name,
        img: h.image,
        book: h.landingUrl,
        price: h.dailyRate,
        currency: h.currency,
        star: h.starRating,
        score: h.reviewScore,
        reviews: h.reviewCount,
        wifi: !!h.freeWifi,
        breakfast: !!h.includeBreakfast,
        lat: h.latitude,
        lng: h.longitude,
        photos: Array.isArray(h.photos) ? h.photos.slice(0, 12) : [],
      };

      const res = await fetch("/api/hotels/shortlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: h.hotelId,
          cityId: h.cityId,
          citySlug,
          hotelSlug,
          payload,
        }),
      });

      let data: any = null;
      let raw = "";
      try {
        data = await res.json();
      } catch {
        raw = await res.text();
      }

      if (!res.ok) {
        console.error("shortlink failed", { status: res.status, data, raw });
        throw new Error(data?.error || raw || "Failed to create shortlink");
      }

      const sid = String(data.code);
      router.push(`/hotels/${citySlug}/${hotelSlug}?sid=${encodeURIComponent(sid)}`);
    } catch (err) {
      console.error(err);

      // ✅ fallback: still keep URL short and allow gallery to load via cityId + hotelId
      const qs = new URLSearchParams({
        cityId: String(h.cityId),
        checkIn,
        checkOut,
        adults: String(adults),
        children: String(children),
      });
      router.push(`/hotels/${citySlug}/${hotelSlug}?${qs.toString()}`);
    } finally {
      setCreating((p) => ({ ...p, [h.hotelId]: false }));
    }
  }

  // ✅ ItemList schema for currently visible hotels (client-side)
  const listLd = useMemo(() => {
    const base = siteUrl();
    if (!base) return null;

    const slice = filteredHotels.slice(0, 30);

    const itemListElement = slice.map((h, idx) => {
      const safeCityId =
        typeof h.cityId === "number" && Number.isFinite(h.cityId) && h.cityId > 0 ? h.cityId : null;

      const citySlug = safeCityId ? getCitySlugForDetails(safeCityId) : "city";

      const url = safeCityId
        ? `${base}/hotels/${citySlug}/${encodeURIComponent(`${slugify(h.name)}-${h.hotelId}`)}`
        : undefined;

      return {
        "@type": "ListItem",
        position: idx + 1,
        url,
        name: h.name,
      };
    });

    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Hotel search results",
      itemListElement,
    };
  }, [filteredHotels, getCitySlugForDetails]);

  return (
    <section className="mt-6">
      {listLd ? (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }}
        />
      ) : null}

      <div className="rounded-2xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="text-xs text-neutral-600">Destination</div>

            <div className="mt-1 flex gap-2">
              <Button
                type="button"
                variant={destinationMode === ALL_VALUE ? "default" : "outline"}
                className="h-10"
                onClick={() => {
                  setDestinationMode(ALL_VALUE);
                  setStateSlug("");
                  setCityId(null);
                }}
              >
                All (Top Cities)
              </Button>

              <Button
                type="button"
                variant={destinationMode !== ALL_VALUE ? "default" : "outline"}
                className="h-10"
                onClick={() => setDestinationMode("city")}
              >
                Choose city
              </Button>
            </div>

            {destinationMode !== ALL_VALUE ? (
              <div className="mt-2 grid gap-2">
                {/* Province */}
                <Popover open={stateOpen} onOpenChange={setStateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={stateOpen}
                      className="w-full justify-between"
                    >
                      <span className="truncate">{selectedStateLabel}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    className="pointer-events-auto z-[9999] w-[--radix-popover-trigger-width] p-0"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <Command>
                      <CommandInput placeholder="Search province…" />
                      <CommandList className="max-h-72 overflow-auto">
                        <CommandEmpty>No province found.</CommandEmpty>

                        <CommandGroup>
                          {states.map((s) => {
                            const selected = stateSlug === s.stateSlug;

                            return (
                              <CommandItem
                                key={s.stateSlug}
                                value={s.stateSlug}
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setStateSlug(s.stateSlug);
                                  setCityId(null);
                                  setStateOpen(false);
                                  setTimeout(() => setCityOpen(true), 50);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                                {s.state}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* City */}
                <Popover open={cityOpen} onOpenChange={setCityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={cityOpen}
                      disabled={!stateSlug}
                      className="w-full justify-between"
                    >
                      <span className="truncate">
                        {!stateSlug ? "Select province first" : selectedCityRow?.city ?? "Select city"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    className="pointer-events-auto z-[9999] w-[--radix-popover-trigger-width] p-0"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <Command>
                      <CommandInput placeholder="Search city…" />
                      <CommandList className="max-h-72 overflow-auto">
                        <CommandEmpty>No city found.</CommandEmpty>

                        <CommandGroup>
                          {filteredCities.map((c) => {
                            const selected = cityId === c.cityId;

                            return (
                              <CommandItem
                                key={c.cityId}
                                value={String(c.cityId)}
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCityId(c.cityId);
                                  setCityOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                                <div className="flex w-full items-center justify-between gap-3">
                                  <span>{c.city}</span>
                                  <span className="text-xs text-neutral-500">{c.state}</span>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ) : null}
          </div>

          <label>
            <div className="text-xs text-neutral-600">Check-in</div>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </label>

          <label>
            <div className="text-xs text-neutral-600">Check-out</div>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </label>

          <label>
            <div className="text-xs text-neutral-600">Adults</div>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              type="number"
              min={1}
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
            />
          </label>

          <label>
            <div className="text-xs text-neutral-600">Children</div>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              type="number"
              min={0}
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-neutral-600">
            Showing {filteredHotels.length}
            {destinationMode === ALL_VALUE && typeof total === "number" ? ` of ${total}` : ""} results for{" "}
            <span className="font-medium">{destinationLabel}</span>
          </div>

          <button
            onClick={() => search(destinationMode === ALL_VALUE ? limit : undefined)}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="mt-6">
        {loading && hotels.length === 0 ? <p className="text-sm text-neutral-600">Loading hotels…</p> : null}

        {!loading && hotels.length === 0 && !error ? (
          <p className="text-sm text-neutral-600">No hotels found for these dates.</p>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* RESULTS */}
          <div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredHotels.map((h) => {
                const safeCityId =
                  typeof h.cityId === "number" && Number.isFinite(h.cityId) && h.cityId > 0 ? h.cityId : null;

                const safeCitySlug = safeCityId ? getCitySlugForDetails(safeCityId) : null;

                const isCreating = !!creating[h.hotelId];

                return (
                  <article key={`${safeCityId ?? "x"}-${h.hotelId}`} className="overflow-hidden rounded-2xl border bg-white">
                    <HotelCardCarousel fallbackImage={h.image} photos={h.photos} alt={h.name} />

                    <div className="p-4">
                      <h3 className="line-clamp-2 text-sm font-semibold">{h.name}</h3>

                      <div className="mt-2 flex items-center justify-between text-xs text-neutral-600">
                        <span>{h.starRating ? `${h.starRating}★` : "—"}</span>
                        <span>
                          {h.reviewScore ? `${h.reviewScore}` : "—"}
                          {h.reviewCount ? ` (${h.reviewCount})` : ""}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {h.freeWifi ? <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px]">Free WiFi</span> : null}
                        {h.includeBreakfast ? (
                          <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px]">Breakfast</span>
                        ) : null}
                        {h.discountPercentage ? (
                          <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px]">{h.discountPercentage}% off</span>
                        ) : null}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">
                          {formatPHP(h.dailyRate)}
                          {h.crossedOutRate && h.crossedOutRate > h.dailyRate ? (
                            <span className="ml-2 text-xs font-normal text-neutral-500 line-through">{formatPHP(h.crossedOutRate)}</span>
                          ) : null}
                          <div className="text-[11px] font-normal text-neutral-500">per night (est.)</div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => safeCitySlug && goToDetails(h, safeCitySlug)}
                          disabled={!safeCityId || !safeCitySlug || isCreating}
                          className={cn(
                            "rounded-lg px-3 py-2 text-xs font-medium text-white",
                            !safeCityId || !safeCitySlug || isCreating ? "bg-black/40" : "bg-black hover:bg-black/90"
                          )}
                          title={!safeCityId ? "Missing cityId for this hotel" : undefined}
                        >
                          {isCreating ? "Opening..." : "View details"}
                        </button>

                        <a
                          href={h.landingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border px-3 py-2 text-xs font-medium"
                        >
                          Book on Agoda
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {destinationMode === ALL_VALUE ? (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={loadMore}
                  className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
                  disabled={loading || loadingMore || !hasMore}
                >
                  {!hasMore ? "End of list" : loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            ) : null}
          </div>

          {/* SIDEBAR */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Filters</h3>
                <button
                  type="button"
                  className="text-xs text-neutral-600 hover:text-neutral-900"
                  onClick={() => {
                    setPriceMin("");
                    setPriceMax("");
                    setMinScore(0);
                    setOnlyWifi(false);
                    setOnlyBreakfast(false);
                    setStarSet(new Set());
                    setSortBy("priceAsc");
                  }}
                >
                  Reset
                </button>
              </div>

              <div className="mt-4">
                <div className="text-xs text-neutral-600">Sort</div>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="priceAsc">Price: Low to High</option>
                  <option value="priceDesc">Price: High to Low</option>
                  <option value="scoreDesc">Rating: High to Low</option>
                  <option value="reviewsDesc">Most reviews</option>
                </select>
              </div>

              <div className="mt-4">
                <div className="text-xs text-neutral-600">Price (PHP)</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Min"
                    inputMode="numeric"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Max"
                    inputMode="numeric"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-neutral-600">Star rating</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[3, 4, 5].map((s) => {
                    const active = starSet.has(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        className={cn(
                          "rounded-lg border px-2 py-2 text-sm",
                          active ? "bg-black text-white border-black" : "bg-white"
                        )}
                        onClick={() => {
                          setStarSet((prev) => {
                            const next = new Set(prev);
                            if (next.has(s)) next.delete(s);
                            else next.add(s);
                            return next;
                          });
                        }}
                      >
                        {s}★
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-neutral-600">Min rating</div>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                >
                  <option value={0}>Any</option>
                  <option value={7}>7+</option>
                  <option value={8}>8+</option>
                  <option value={9}>9+</option>
                </select>
              </div>

              <div className="mt-4 space-y-2">
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>Free WiFi</span>
                  <input type="checkbox" checked={onlyWifi} onChange={(e) => setOnlyWifi(e.target.checked)} />
                </label>

                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>Breakfast included</span>
                  <input type="checkbox" checked={onlyBreakfast} onChange={(e) => setOnlyBreakfast(e.target.checked)} />
                </label>
              </div>

              <div className="mt-4 border-t pt-3 text-xs text-neutral-600">
                Showing <span className="font-medium text-neutral-900">{filteredHotels.length}</span> results
                {destinationMode === ALL_VALUE && typeof total === "number" ? ` (pool: ${total})` : ""}
              </div>
            </div>
          </aside>
        </div>

        <p className="mt-6 text-xs text-neutral-500">
          Prices and availability are provided by Agoda and may change. Booking is completed on Agoda.
        </p>
      </div>
    </section>
  );
}