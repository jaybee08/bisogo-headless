// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export const runtime = "nodejs";

type Body = { tag?: string; path?: string; secret?: string };

export async function POST(req: NextRequest) {
  // (optional) protect this endpoint
  const secret = process.env.REVALIDATE_SECRET;
  const body = (await req.json().catch(() => ({}))) as Body;

  if (secret && body.secret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (body.tag) {
      // Some Next.js typings expect a 2nd arg (options). Passing {} is safe.
      (revalidateTag as unknown as (tag: string, opts?: any) => void)(body.tag, {});
      return NextResponse.json({ revalidated: true, tag: body.tag });
    }

    if (body.path) {
      // revalidatePath can also take a 2nd arg in some typings ("page" | "layout")
      (revalidatePath as unknown as (path: string, type?: "page" | "layout") => void)(body.path, "page");
      return NextResponse.json({ revalidated: true, path: body.path });
    }

    return NextResponse.json(
      { error: "Provide { tag } or { path }" },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Revalidate failed" },
      { status: 500 }
    );
  }
}