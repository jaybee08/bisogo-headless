import { NextResponse } from "next/server";
import readline from "node:readline";
import { Readable } from "node:stream";

export const runtime = "nodejs";

/**
 * GET /api/agoda/photos?cityId=4001&hotelIds=55711754,9788149
 * Returns: { photos: { "55711754": ["..."], "9788149": ["..."] } }
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const cityId = url.searchParams.get("cityId")?.trim();
    const hotelIdsParam = url.searchParams.get("hotelIds")?.trim();

    if (!cityId) return NextResponse.json({ error: "Missing cityId" }, { status: 400 });
    if (!hotelIdsParam) return NextResponse.json({ error: "Missing hotelIds" }, { status: 400 });

    const hotelIds = hotelIdsParam
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (hotelIds.length === 0) {
      return NextResponse.json({ error: "hotelIds must be a comma-separated list of numbers" }, { status: 400 });
    }

    // Safety limit (avoid huge scans from the client)
    const LIMIT = 50;
    if (hotelIds.length > LIMIT) {
      return NextResponse.json({ error: `Too many hotelIds (max ${LIMIT})` }, { status: 400 });
    }

    const base = process.env.CMS_DATA_BASE_URL;
    if (!base) {
      return NextResponse.json({ error: "Missing CMS_DATA_BASE_URL" }, { status: 500 });
    }

    const set = new Set(hotelIds);
    const found: Record<string, string[]> = {};

    const ndjsonUrl = `${base}/cities/${cityId}.ndjson`;

    const res = await fetch(ndjsonUrl, {
      // Cache the city file for 24h at the Next.js layer (public dataset)
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!res.ok || !res.body) {
      return NextResponse.json(
        { error: "Failed to fetch city NDJSON", status: res.status, url: ndjsonUrl },
        { status: 502 }
      );
    }

    // Convert Web ReadableStream -> Node Readable for readline
    const nodeStream = Readable.fromWeb(res.body as any);

    const rl = readline.createInterface({
      input: nodeStream,
      crlfDelay: Infinity,
    });

    // Stream scan lines, pick only requested hotels
    for await (const line of rl) {
      if (set.size === 0) break; // early exit once all found
      if (!line || !line.trim()) continue;

      let obj: any;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }

      const hid = Number(obj?.hotelId);
      if (!hid || !set.has(hid)) continue;

      const photos = Array.isArray(obj?.photos) ? obj.photos.filter(Boolean) : [];
      found[String(hid)] = photos;

      set.delete(hid);
    }

    return NextResponse.json({
      cityId,
      photos: found,
      meta: {
        requested: hotelIds.length,
        found: Object.keys(found).length,
        missing: Array.from(set),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Unexpected server error", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}