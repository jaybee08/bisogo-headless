import { NextResponse } from "next/server";

export const runtime = "nodejs";
const AGODA_ENDPOINT = "http://affiliateapi7643.agoda.com/affiliateservice/lt_v1";

function qInt(value: string | null, fallback: number) {
  if (value === null || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const hotelId = qInt(url.searchParams.get("hotelId"), 0);
    const checkIn = url.searchParams.get("checkIn") || "";
    const checkOut = url.searchParams.get("checkOut") || "";
    const adults = Math.max(1, qInt(url.searchParams.get("adults"), 2));
    const children = Math.max(0, qInt(url.searchParams.get("children"), 0));

    if (!hotelId) return NextResponse.json({ error: "Missing hotelId" }, { status: 400 });
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

    // ✅ Hotel List Search request (from your PDF snippet)
    const body = {
      criteria: {
        additional: {
          currency: "PHP",
          discountOnly: false,
          language: "en-us",
          occupancy: {
            numberOfAdult: adults,
            numberOfChildren: children,
          },
        },
        checkInDate: checkIn,
        checkOutDate: checkOut,
        hotelId: [hotelId],
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
        { error: "Agoda API error", status: res.status, details: text.slice(0, 3000) },
        { status: 502 }
      );
    }

    // Return raw response so you can see fields
    return NextResponse.json(JSON.parse(text));
  } catch (e: any) {
    return NextResponse.json(
      { error: "Unexpected server error", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}