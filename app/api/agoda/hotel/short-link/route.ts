import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { hotelShortlinks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

// minimal validation: we only require payload object
function isValidIncoming(x: any) {
  return x && typeof x === "object" && x.payload && typeof x.payload === "object";
}

// POST /api/agoda/hotel/short-link
// Creates a short id (stored in hotel_shortlinks.id)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!isValidIncoming(body)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const id = nanoid(10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(hotelShortlinks).values({
      id,
      payload: body.payload,
      expiresAt,
    });

    // ✅ return in a consistent shape for your client
    return NextResponse.json({ sid: id });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to create shortlink", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}

// GET /api/agoda/hotel/short-link?sid=xxxx
// Resolves by hotel_shortlinks.id
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sid = (url.searchParams.get("sid") || "").trim();

    if (!sid) return NextResponse.json({ error: "Missing sid" }, { status: 400 });

    const row = await db.query.hotelShortlinks.findFirst({
      where: eq(hotelShortlinks.id, sid),
      columns: { id: true, payload: true, expiresAt: true },
    });

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }

    return NextResponse.json({ sid: row.id, payload: row.payload });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to resolve shortlink", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}