import { NextResponse } from "next/server";
import { TOP_CITY_IDS_PH } from "@/lib/agoda/top-cities";

export const runtime = "nodejs";

const AGODA_ENDPOINT = "http://affiliateapi7643.agoda.com/affiliateservice/lt_v1";
const MAX_PER_CITY = 50; // Agoda lite typically caps here (safe ceiling)

function qInt(value: string | null, fallback: number) {
  if (value === null || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function citySearch(params: {
  cityId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  maxResult: number;
  siteId: string;
  apiKey: string;
}) {
  const { cityId, checkIn, checkOut, adults, children, maxResult, siteId, apiKey } = params;

  const body = {
    criteria: {
      additional: {
        currency: "PHP",
        discountOnly: false,
        language: "en-us",
        maxResult,
        minimumReviewScore: 0,
        minimumStarRating: 0,
        occupancy: { numberOfAdult: adults, numberOfChildren: children },
        sortBy: "PriceAsc",
      },
      checkInDate: checkIn,
      checkOutDate: checkOut,
      cityId,
    },
  };

  const res = await fetch(AGODA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip,deflate",
      Authorization: `${siteId}:${apiKey}`,
    },
    body: JSON.stringify(body),
    next: { revalidate: 300 },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text);

  const data = JSON.parse(text);

  const rows = (data?.results ?? []).map((h: any) => ({
    cityId,
    hotelId: h.hotelId,
    name: h.hotelName,
    starRating: h.starRating,
    reviewScore: h.reviewScore,
    reviewCount: h.reviewCount,
    currency: h.currency,
    dailyRate: h.dailyRate,
    crossedOutRate: h.crossedOutRate,
    discountPercentage: h.discountPercentage,
    image: h.imageURL,
    landingUrl: h.landingURL,
    includeBreakfast: h.includeBreakfast,
    freeWifi: h.freeWifi,
    latitude: h.latitude,
    longitude: h.longitude,
  }));

  return rows;
}

function mergeAndSort(all: any[]) {
  // de-dupe by hotelId
  const dedup = new Map<number, any>();
  for (const h of all) if (h?.hotelId && !dedup.has(h.hotelId)) dedup.set(h.hotelId, h);

  // sort by price asc (nulls go last)
  const merged = Array.from(dedup.values()).sort(
    (a, b) => (a.dailyRate ?? 1e15) - (b.dailyRate ?? 1e15)
  );

  return merged;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const checkIn = url.searchParams.get("checkIn") || "";
    const checkOut = url.searchParams.get("checkOut") || "";
    const adults = Math.max(1, qInt(url.searchParams.get("adults"), 2));
    const children = Math.max(0, qInt(url.searchParams.get("children"), 0));

    const requestedLimit = Math.min(200, Math.max(1, qInt(url.searchParams.get("limit"), 21)));

    if (!checkIn || !checkOut) {
      return NextResponse.json({ error: "Missing checkIn/checkOut" }, { status: 400 });
    }
    if (checkOut <= checkIn) {
      return NextResponse.json({ error: "checkOut must be after checkIn" }, { status: 400 });
    }

    const siteId = process.env.AGODA_LITE_SITE_ID;
    const apiKey = process.env.AGODA_LITE_API_KEY;
    if (!siteId || !apiKey) {
      return NextResponse.json({ error: "Missing Agoda env vars" }, { status: 500 });
    }

    const cityIds = TOP_CITY_IDS_PH;
    const cityCount = Math.max(1, cityIds.length);

    // Pass 1: choose perCityMax based on requestedLimit (plus buffer to offset de-dupe)
    const perCityMax1 = Math.min(
      MAX_PER_CITY,
      Math.max(15, Math.ceil(requestedLimit / cityCount) + 10)
    );

    const perCityCount1: Record<string, number> = {};
    const all1 = (
      await Promise.all(
        cityIds.map(async (cityId) => {
          const rows = await citySearch({
            cityId,
            checkIn,
            checkOut,
            adults,
            children,
            maxResult: perCityMax1,
            siteId,
            apiKey,
          });
          perCityCount1[String(cityId)] = rows.length;
          return rows;
        })
      )
    ).flat();

    let merged = mergeAndSort(all1);

    // Pass 2: if we still can't reach requestedLimit, try max per city (50)
    let usedSecondPass = false;
    let perCityCount2: Record<string, number> | null = null;

    if (merged.length < requestedLimit && perCityMax1 < MAX_PER_CITY) {
      usedSecondPass = true;
      perCityCount2 = {};

      const all2 = (
        await Promise.all(
          cityIds.map(async (cityId) => {
            const rows = await citySearch({
              cityId,
              checkIn,
              checkOut,
              adults,
              children,
              maxResult: MAX_PER_CITY,
              siteId,
              apiKey,
            });
            perCityCount2![String(cityId)] = rows.length;
            return rows;
          })
        )
      ).flat();

      merged = mergeAndSort(all2); // replace pool with bigger pool
    }

    const poolTotal = merged.length;
    const hotels = merged.slice(0, Math.min(requestedLimit, poolTotal));
    const hasMore = poolTotal > hotels.length;

    return NextResponse.json({
      hotels,
      meta: {
        requestedLimit,
        returned: hotels.length,
        poolTotal,
        hasMore,
        cityIds,
        pass1: { perCityMax: perCityMax1, perCityReturned: perCityCount1 },
        pass2: usedSecondPass
          ? { perCityMax: MAX_PER_CITY, perCityReturned: perCityCount2 }
          : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Aggregate search failed", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}