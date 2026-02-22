import { NextRequest } from "next/server";
import { storeProxy } from "@/lib/woo/store-proxy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  // expects: { key: string, quantity: number }
  return storeProxy(req, "/cart/update-item", {
    method: "POST",
    body: JSON.stringify(body),
  });
}