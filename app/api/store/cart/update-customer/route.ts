// app/api/store/cart/update-customer/route.ts
import { NextRequest } from "next/server";
import { storeProxy } from "@/lib/woo/store-proxy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return storeProxy(req, "/cart/update-customer", { method: "POST", body: JSON.stringify(body) });
}