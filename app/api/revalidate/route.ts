export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token || token !== process.env.REVALIDATE_TOKEN) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { tag?: string; path?: string };
  if (body.tag) {
    revalidateTag(body.tag);
    return NextResponse.json({ revalidated: true, tag: body.tag });
  }
  if (body.path) {
    revalidatePath(body.path);
    return NextResponse.json({ revalidated: true, path: body.path });
  }
  return NextResponse.json({ error: "Provide { tag } or { path }" }, { status: 400 });
}
