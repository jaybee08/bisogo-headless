import { NextResponse } from "next/server";
import { db } from "@/db";
import { hotelShortlinks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

// GET /api/hotels/shortlink/resolve?code=xxxx
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = (url.searchParams.get("code") || "").trim();

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const row = await db.query.hotelShortlinks.findFirst({
      where: eq(hotelShortlinks.id, code),
      columns: {
        id: true,
        payload: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }

    // ✅ Only return what exists in this table shape
    return NextResponse.json(
      {
        code: row.id,
        payload: row.payload,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to resolve shortlink", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}