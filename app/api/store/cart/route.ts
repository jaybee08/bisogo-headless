// app/api/store/cart/route.ts
import { NextRequest } from "next/server";
import { storeProxy } from "@/lib/woo/store-proxy";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return storeProxy(req, "/cart");
}