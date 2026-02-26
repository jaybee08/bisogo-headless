// app/api/account/profile/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { updateWooCustomer } from "@/lib/woo/customer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const wooCustomerId = Number((session.user as any)?.wooCustomerId || 0);
    if (!wooCustomerId) {
      return NextResponse.json({ error: "Missing Woo customer id" }, { status: 400 });
    }

    const body = await req.json();

    const first_name = String(body?.first_name || "").trim();
    const last_name = String(body?.last_name || "").trim();
    const billing = body?.billing || {};
    const shipping = body?.shipping || {};

    await updateWooCustomer(wooCustomerId, {
      first_name,
      last_name,
      billing,
      shipping,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update profile" }, { status: 500 });
  }
}