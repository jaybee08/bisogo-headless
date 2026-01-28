import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, message: "Invalid email" }, { status: 400 });
  }

  // TODO: Wire to Klaviyo/Mailchimp later.
  // For now, just succeed so CRO UI works.
  return NextResponse.json({ ok: true });
}