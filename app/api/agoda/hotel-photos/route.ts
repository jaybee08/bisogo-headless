import { NextResponse } from "next/server";
import readline from "node:readline";
import { Readable } from "node:stream";

export const runtime = "nodejs";

/**
 * GET /api/agoda/hotel-photos?hotelId=60484735
 * Returns: { hotelId, cityId, photos: [...] }
 *
 * Requires:
 *  - CMS_DATA_BASE_URL (e.g. https://cms.bisogo.ph/data/agoda)
 *  - hotel-city-ph.json at `${CMS_DATA_BASE_URL}/hotel-city-ph.json`
 *  - city NDJSON at `${CMS_DATA_BASE_URL}/cities/${cityId}.ndjson`
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const hotelId = Number(url.searchParams.get("hotelId") || 0);

    if (!hotelId || !Number.isFinite(hotelId)) {
      return NextResponse.json({ error: "Missing/invalid hotelId" }, { status: 400 });
    }

    const base = process.env.CMS_DATA_BASE_URL;
    if (!base) {
      return NextResponse.json({ error: "Missing CMS_DATA_BASE_URL" }, { status: 500 });
    }

    // 1) Fetch hotelId -> cityId map (cache 24h)
    const mapUrl = `${base}/hotel-city-ph.json`;
    const mapRes = await fetch(mapUrl, { next: { revalidate: 60 * 60 * 24 } });

    if (!mapRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch hotel-city map", status: mapRes.status, url: mapUrl },
        { status: 502 }
      );
    }

    const mapJson = (await mapRes.json()) as Record<string, number>;
    const cityId = mapJson[String(hotelId)];

    if (!cityId) {
      return NextResponse.json(
        { error: "hotelId not found in PH index", hotelId },
        { status: 404 }
      );
    }

    // 2) Stream-scan that city's NDJSON and find the hotel photos
    const ndjsonUrl = `${base}/cities/${cityId}.ndjson`;
    const res = await fetch(ndjsonUrl, { next: { revalidate: 60 * 60 * 24 } });

    if (!res.ok || !res.body) {
      return NextResponse.json(
        { error: "Failed to fetch city NDJSON", status: res.status, url: ndjsonUrl },
        { status: 502 }
      );
    }

    const nodeStream = Readable.fromWeb(res.body as any);
    const rl = readline.createInterface({ input: nodeStream, crlfDelay: Infinity });

    let photos: string[] = [];

    for await (const line of rl) {
      if (!line || !line.trim()) continue;

      let obj: any;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }

      const hid = Number(obj?.hotelId);
      if (hid !== hotelId) continue;

      photos = Array.isArray(obj?.photos) ? obj.photos.filter(Boolean) : [];
      break;
    }

    return NextResponse.json({
      hotelId,
      cityId,
      photos,
      meta: { found: photos.length > 0 },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Unexpected server error", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}