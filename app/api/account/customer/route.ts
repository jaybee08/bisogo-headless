import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getWooCustomerById, updateWooCustomer } from "@/lib/woo/customer";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wooCustomerId = Number((session.user as any).wooCustomerId || 0);
  if (!wooCustomerId) {
    return NextResponse.json({ error: "Missing wooCustomerId" }, { status: 400 });
  }

  const customer = await getWooCustomerById(wooCustomerId);
  return NextResponse.json({ customer });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wooCustomerId = Number((session.user as any).wooCustomerId || 0);
  if (!wooCustomerId) {
    return NextResponse.json({ error: "Missing wooCustomerId" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  const customer = await updateWooCustomer(wooCustomerId, body);
  return NextResponse.json({ customer });
}