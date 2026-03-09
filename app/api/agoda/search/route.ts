import { NextResponse } from "next/server";

export const runtime = "nodejs";

const AGODA_ENDPOINT = "http://affiliateapi7643.agoda.com/affiliateservice/lt_v1";

function qInt(value: string | null, fallback: number) {
  // Treat null/empty as missing (prevents Number(null) === 0)
  if (value === null || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const cityId = qInt(url.searchParams.get("cityId"), 0);
    const checkIn = url.searchParams.get("checkIn") || "";
    const checkOut = url.searchParams.get("checkOut") || "";

    const adults = Math.max(1, qInt(url.searchParams.get("adults"), 2));
    const children = Math.max(0, qInt(url.searchParams.get("children"), 0));
    const maxResult = Math.min(50, Math.max(1, qInt(url.searchParams.get("maxResult"), 21)));

    if (!cityId) return NextResponse.json({ error: "Missing cityId" }, { status: 400 });
    if (!checkIn || !checkOut)
      return NextResponse.json({ error: "Missing checkIn/checkOut" }, { status: 400 });
    if (checkOut <= checkIn)
      return NextResponse.json({ error: "checkOut must be after checkIn" }, { status: 400 });

    const siteId = process.env.AGODA_LITE_SITE_ID;
    const apiKey = process.env.AGODA_LITE_API_KEY;

    if (!siteId || !apiKey) {
      return NextResponse.json(
        { error: "Missing Agoda env vars (AGODA_LITE_SITE_ID / AGODA_LITE_API_KEY)" },
        { status: 500 }
      );
    }

    const body = {
      criteria: {
        additional: {
          currency: "PHP",
          discountOnly: false,
          language: "en-us",
          maxResult,
          minimumReviewScore: 0,
          minimumStarRating: 0,
          occupancy: {
            numberOfAdult: adults,
            numberOfChildren: children,
          },
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

    if (!res.ok) {
      return NextResponse.json(
        { error: "Agoda API error", status: res.status, details: text.slice(0, 1500) },
        { status: 502 }
      );
    }

    const data = JSON.parse(text);

    const hotels = (data?.results ?? []).map((h: any) => ({
      cityId, // ✅ add this (the cityId you parsed from query)
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

    return NextResponse.json({
      hotels,
      meta: { count: hotels.length, cityId, checkIn, checkOut, adults, children, maxResult },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Unexpected server error", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}