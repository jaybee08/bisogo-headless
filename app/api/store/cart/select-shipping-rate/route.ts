// app/api/store/cart/select-shipping-rate/route.ts
import { NextRequest } from "next/server";
import { storeProxy } from "@/lib/woo/store-proxy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  // expects { package_id: number, rate_id: string }
  return storeProxy(req, "/cart/select-shipping-rate", { method: "POST", body: JSON.stringify(body) });
}