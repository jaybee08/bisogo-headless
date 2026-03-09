import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { hotelShortlinks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

function getPayload(body: any) {
  // allow {payload:{...}} OR {...} directly
  if (body && typeof body === "object" && body.payload && typeof body.payload === "object") return body.payload;
  if (body && typeof body === "object") return body;
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = getPayload(body);

    if (!payload) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const id = nanoid(10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(hotelShortlinks).values({
      id,
      payload,
      expiresAt,
    });

    return NextResponse.json({ code: id });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to create shortlink", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // ✅ accept any of these: code / sid / id
    const code =
      (url.searchParams.get("code") || url.searchParams.get("sid") || url.searchParams.get("id") || "").trim();

    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    const row = await db.query.hotelShortlinks.findFirst({
      where: eq(hotelShortlinks.id, code),
      columns: { id: true, payload: true, expiresAt: true },
    });

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }

    return NextResponse.json({ code: row.id, payload: row.payload });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to resolve shortlink", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}