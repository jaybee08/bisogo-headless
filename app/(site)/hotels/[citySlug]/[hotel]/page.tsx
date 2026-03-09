import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";

export const runtime = "nodejs";

function extractHotelId(hotelParam: unknown) {
  const s =
    typeof hotelParam === "string"
      ? hotelParam
      : Array.isArray(hotelParam)
        ? hotelParam.join("/")
        : "";

  if (!s) return 0;
  const matches = s.match(/(\d{4,})/g);
  if (!matches?.length) return 0;
  return Number(matches[matches.length - 1]);
}

function getBaseUrl() {
  // ✅ In local dev, ALWAYS hit local app for internal API routes
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";

  // ✅ In prod, use your canonical site url
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;

  return "http://localhost:3000";
}

function toSiteUrl() {
  const u =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return u.replace(/\/$/, "");
}

function formatCurrency(n: number, currency = "PHP") {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function toHiResAgodaImage(url: string, size = "2000x1500") {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("s", size);
    return u.toString();
  } catch {
    return url
      .replace(/([?&])s=\d+x\d*/i, `$1s=${size}`)
      .replace(/([?&])s=\d+x/i, `$1s=${size}`);
  }
}

async function fetchHotelLite(params: {
  hotelId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}) {
  const qs = new URLSearchParams({
    hotelId: String(params.hotelId),
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    adults: String(params.adults),
    children: String(params.children),
  });

  const res = await fetch(`${getBaseUrl()}/api/agoda/hotel?${qs.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;

  const json = await res.json();
  const first = json?.results?.[0];
  if (!first) return null;

  return {
    hotelId: first.hotelId,
    hotelName: first.hotelName,
    roomtypeName: first.roomtypeName,
    starRating: first.starRating,
    reviewScore: first.reviewScore,
    reviewCount: first.reviewCount,
    currency: first.currency,
    dailyRate: first.dailyRate,
    crossedOutRate: first.crossedOutRate,
    discountPercentage: first.discountPercentage,
    imageURL: first.imageURL,
    landingURL: first.landingURL,
    includeBreakfast: first.includeBreakfast,
    freeWifi: first.freeWifi,
    latitude: first.latitude,
    longitude: first.longitude,
  };
}

async function getPhotos(cityId: number, hotelId: number) {
  const qs = new URLSearchParams({
    cityId: String(cityId),
    hotelIds: String(hotelId),
  });

  const res = await fetch(`${getBaseUrl()}/api/agoda/photos?${qs.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) return [];
  const json = await res.json();
  const arr = json?.photos?.[String(hotelId)];
  return Array.isArray(arr) ? (arr as string[]) : [];
}

/**
 * ✅ Shortlink payload stored in DB (hotel_shortlinks.payload)
 * IMPORTANT: include cityId so gallery can load via /api/agoda/photos.
 */
type ShortPayload = {
  hotelId?: number;
  cityId?: number;

  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;

  name?: string;
  img?: string;
  book?: string;
  price?: number;
  currency?: string;
  star?: number;
  score?: number;
  reviews?: number;
  wifi?: boolean;
  breakfast?: boolean;
  lat?: number;
  lng?: number;
  photos?: string[];
};

async function resolveShortlink(code: string) {
  const res = await fetch(
    `${getBaseUrl()}/api/hotels/shortlink?code=${encodeURIComponent(code)}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;

  return (await res.json()) as {
    code: string;
    payload: any;
    // include these if your API returns them:
    hotelId?: number;
    cityId?: number;
    citySlug?: string;
    hotelSlug?: string;
  };
}

type ParamsMaybePromise =
  | Promise<{ citySlug: string; hotel: string }>
  | { citySlug: string; hotel: string };

type SearchParamsMaybePromise =
  | Promise<{
      sid?: string; // short token
      // minimal fallback params if sid missing/failed
      cityId?: string;
      checkIn?: string;
      checkOut?: string;
      adults?: string;
      children?: string;
    }>
  | {
      sid?: string;
      cityId?: string;
      checkIn?: string;
      checkOut?: string;
      adults?: string;
      children?: string;
    };

/**
 * Metadata: keep canonical clean (no query string)
 */
export async function generateMetadata({
  params,
}: {
  params: ParamsMaybePromise;
  searchParams: SearchParamsMaybePromise;
}): Promise<Metadata> {
  const p = await Promise.resolve(params);
  const siteUrl = toSiteUrl();
  const citySlug = p?.citySlug ?? "city";
  const hotelSlug = p?.hotel ?? "";
  const hotelId = extractHotelId(hotelSlug);

  const canonical = `${siteUrl}/hotels/${citySlug}/${hotelSlug}`;
  const title = hotelId ? `Hotel #${hotelId}` : "Hotel";

  return {
    title: `${title} | Bisogo Hotels`,
    description: `View details for ${title}. Compare prices and book via Agoda.`,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Bisogo Hotels`,
      description: `View details for ${title}. Compare prices and book via Agoda.`,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Bisogo Hotels`,
      description: `View details for ${title}. Compare prices and book via Agoda.`,
    },
  };
}

export default async function HotelDetailsPage({
  params,
  searchParams,
}: {
  params: ParamsMaybePromise;
  searchParams: SearchParamsMaybePromise;
}) {
  const p = await Promise.resolve(params);
  const sp = await Promise.resolve(searchParams);

  const siteUrl = toSiteUrl();

  const citySlug = p?.citySlug ?? "city";
  const hotelParam = p?.hotel ?? "";
  const hotelId = extractHotelId(hotelParam);

  if (!hotelId) {
    return (
      <main className="container py-10">
        <h1 className="text-2xl font-semibold">Hotel not found</h1>
        <p className="mt-2 text-sm text-neutral-600">Invalid hotel URL.</p>
        <Link
          className="mt-6 inline-block rounded-lg border px-4 py-2 text-sm"
          href="/hotels"
        >
          Back to hotels
        </Link>
      </main>
    );
  }

  // defaults
  const today = new Date();
  const plusDays = (d: number) => {
    const x = new Date(today);
    x.setDate(x.getDate() + d);
    return x.toISOString().slice(0, 10);
  };

  // ✅ resolve sid -> payload
  const sid = typeof sp?.sid === "string" ? sp.sid.trim() : "";
  const row = sid ? await resolveShortlink(sid) : null;

  if (sid && !row) {
    return (
      <main className="container py-10">
        <h1 className="text-2xl font-semibold">Link expired</h1>
        <p className="mt-2 text-sm text-neutral-600">
          This hotel link is no longer available.
        </p>
        <Link
          className="mt-6 inline-block rounded-lg border px-4 py-2 text-sm"
          href="/hotels"
        >
          Back to hotels
        </Link>
      </main>
    );
  }

  const payload: ShortPayload | null = (row?.payload ?? null) as ShortPayload | null;

  // ✅ FIX: cityId must come from payload (because API returns only {code,payload})
  // Fallback to query if opened without sid
  const cityId = Number(payload?.cityId ?? sp?.cityId ?? 0);

  // Prefer DB payload; else minimal query; else defaults
  const checkIn = String(payload?.checkIn ?? sp?.checkIn ?? plusDays(7));
  const checkOut = String(payload?.checkOut ?? sp?.checkOut ?? plusDays(9));
  const adults = Math.max(1, Number(payload?.adults ?? sp?.adults ?? 2));
  const children = Math.max(0, Number(payload?.children ?? sp?.children ?? 0));

  // live
  const live = await fetchHotelLite({ hotelId, checkIn, checkOut, adults, children });

  // payload fallbacks
  const fallbackName = (payload?.name || "").trim();
  const fallbackImg = (payload?.img || "").trim();
  const fallbackBook = (payload?.book || "").trim();

  const fallbackCurrency = (payload?.currency || "PHP").trim();
  const fallbackPrice = Number.isFinite(payload?.price as number)
    ? (payload!.price as number)
    : NaN;
  const fallbackStar = Number.isFinite(payload?.star as number)
    ? (payload!.star as number)
    : NaN;
  const fallbackScore = Number.isFinite(payload?.score as number)
    ? (payload!.score as number)
    : NaN;
  const fallbackReviews = Number.isFinite(payload?.reviews as number)
    ? (payload!.reviews as number)
    : NaN;

  const fallbackWifi = typeof payload?.wifi === "boolean" ? payload.wifi : false;
  const fallbackBreakfast =
    typeof payload?.breakfast === "boolean" ? payload.breakfast : false;

  const fallbackLat = Number.isFinite(payload?.lat as number)
    ? (payload!.lat as number)
    : NaN;
  const fallbackLng = Number.isFinite(payload?.lng as number)
    ? (payload!.lng as number)
    : NaN;

  // display data
  const title = live?.hotelName || fallbackName || `Hotel #${hotelId}`;
  const currency = live?.currency || fallbackCurrency || "PHP";
  const dailyRate = Number.isFinite(live?.dailyRate) ? live!.dailyRate : fallbackPrice;
  const crossedOutRate = Number.isFinite(live?.crossedOutRate)
    ? live!.crossedOutRate
    : NaN;

  const starRating = Number.isFinite(live?.starRating) ? live!.starRating : fallbackStar;
  const reviewScore = Number.isFinite(live?.reviewScore) ? live!.reviewScore : fallbackScore;
  const reviewCount = Number.isFinite(live?.reviewCount) ? live!.reviewCount : fallbackReviews;

  const includeBreakfast =
    typeof live?.includeBreakfast === "boolean" ? live.includeBreakfast : fallbackBreakfast;
  const freeWifi =
    typeof live?.freeWifi === "boolean" ? live.freeWifi : fallbackWifi;

  const latitude = Number.isFinite(live?.latitude) ? live!.latitude : fallbackLat;
  const longitude = Number.isFinite(live?.longitude) ? live!.longitude : fallbackLng;

  const roomtypeName = live?.roomtypeName || "";
  const bookUrl = live?.landingURL || fallbackBook;

  // ✅ Photos:
  // - prefer payload.photos (from listing -> DB)
  // - else use /api/agoda/photos if we have cityId
  const photos =
    Array.isArray(payload?.photos) && payload.photos.length > 0
      ? payload.photos
      : cityId
        ? await getPhotos(cityId, hotelId)
        : [];

  const heroFallback = live?.imageURL || fallbackImg;

  const galleryRaw =
    photos.length > 0
      ? heroFallback
        ? [heroFallback, ...photos]
        : photos
      : heroFallback
        ? [heroFallback]
        : [];

  const gallery = Array.from(
    new Set(
      galleryRaw
        .filter(Boolean)
        .map((src) => toHiResAgodaImage(src, "2000x1500"))
    )
  );

  const hero = gallery[0] || "";
  const restPhotos = gallery.slice(1);

  // canonical clean
  const canonical = `${siteUrl}/hotels/${citySlug}/${hotelParam}`;

  // JSON-LD
  const hotelLd: any = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: title,
    url: canonical,
    identifier: String(hotelId),
    image: gallery.length ? gallery.slice(0, 10) : undefined,
    geo:
      Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { "@type": "GeoCoordinates", latitude, longitude }
        : undefined,
  };

  if (
    Number.isFinite(reviewScore) &&
    reviewScore > 0 &&
    Number.isFinite(reviewCount) &&
    reviewCount > 0
  ) {
    hotelLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewScore,
      reviewCount,
    };
  }

  if (Number.isFinite(dailyRate)) {
    hotelLd.offers = {
      "@type": "Offer",
      priceCurrency: currency || "PHP",
      price: String(dailyRate),
      url: bookUrl || canonical,
      availability: "https://schema.org/InStock",
    };
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Hotels", item: `${siteUrl}/hotels` },
      { "@type": "ListItem", position: 3, name: citySlug, item: `${siteUrl}/hotels/${citySlug}` },
      { "@type": "ListItem", position: 4, name: title, item: canonical },
    ],
  };

  return (
    <main className="container py-10">
      <Script
        id="jsonld-hotel"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelLd) }}
      />
      <Script
        id="jsonld-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-neutral-500">Hotels • {citySlug}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
            {Number.isFinite(starRating) && starRating > 0 ? <span>{starRating}★</span> : null}
            {Number.isFinite(reviewScore) && reviewScore > 0 ? (
              <span>
                {reviewScore}
                {Number.isFinite(reviewCount) && reviewCount > 0 ? ` (${reviewCount} reviews)` : ""}
              </span>
            ) : null}
            {freeWifi ? (
              <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">Free WiFi</span>
            ) : null}
            {includeBreakfast ? (
              <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">Breakfast</span>
            ) : null}
          </div>

          {!live ? (
            <p className="mt-2 text-xs text-neutral-500">
              Live availability not returned for these dates — showing preview details from the listing.
            </p>
          ) : null}

          {/* Debug hints */}
          {sid && payload && !payload.cityId ? (
            <p className="mt-2 text-xs text-red-600">
              Payload is missing cityId — please include cityId when creating the shortlink.
            </p>
          ) : null}
          {sid && !cityId ? (
            <p className="mt-2 text-xs text-red-600">
              cityId is 0, so /api/agoda/photos can’t load.
            </p>
          ) : null}
        </div>

        <Link href="/hotels" className="rounded-lg border px-4 py-2 text-sm font-medium">
          Back
        </Link>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div>
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hero}
              alt={title}
              className="aspect-[16/10] w-full rounded-2xl object-cover"
              loading="eager"
            />
          ) : (
            <div className="aspect-[16/10] w-full rounded-2xl bg-neutral-100" />
          )}

          {restPhotos.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {restPhotos.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="aspect-[4/3] w-full rounded-2xl object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          ) : null}

          <p className="mt-8 text-xs text-neutral-500">
            Prices and availability are provided by Agoda and may change. Booking is completed on Agoda.
          </p>
        </div>

        {/* RIGHT sticky */}
        <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border bg-white p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs text-neutral-500">Estimated price / night</div>
              <div className="mt-1 text-2xl font-semibold">
                {Number.isFinite(dailyRate) ? formatCurrency(dailyRate, currency) : "—"}
              </div>
              {Number.isFinite(crossedOutRate) &&
              Number.isFinite(dailyRate) &&
              crossedOutRate > dailyRate ? (
                <div className="mt-1 text-sm text-neutral-500 line-through">
                  {formatCurrency(crossedOutRate, currency)}
                </div>
              ) : null}
            </div>

            {Number.isFinite(reviewScore) && reviewScore > 0 ? (
              <div className="rounded-xl border px-3 py-2 text-right">
                <div className="text-sm font-semibold">{reviewScore}</div>
                <div className="text-xs text-neutral-500">
                  {Number.isFinite(reviewCount) && reviewCount > 0 ? `${reviewCount} reviews` : "Reviews"}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2 text-sm text-neutral-600">
            <div className="flex items-center justify-between">
              <span>Check-in</span>
              <span className="font-medium text-neutral-900">{checkIn}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Check-out</span>
              <span className="font-medium text-neutral-900">{checkOut}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Guests</span>
              <span className="font-medium text-neutral-900">
                {adults} adult{adults > 1 ? "s" : ""}
                {children ? `, ${children} child` : ""}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <a
              href={bookUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-medium text-white ${
                bookUrl ? "bg-black hover:bg-black/90" : "bg-black/40 pointer-events-none"
              }`}
            >
              Book on Agoda
            </a>
            <p className="mt-2 text-xs text-neutral-500">Booking is completed on Agoda.</p>
          </div>

          {/* Try different dates (preserve sid) */}
          <div className="mt-6 border-t pt-5">
            <h3 className="text-sm font-semibold">Try different dates</h3>

            <form method="GET" className="mt-3 grid gap-3">
              {sid ? <input type="hidden" name="sid" value={sid} /> : null}
              {!sid && cityId ? <input type="hidden" name="cityId" value={String(cityId)} /> : null}

              <label className="grid gap-1">
                <span className="text-xs text-neutral-600">Check-in</span>
                <input
                  name="checkIn"
                  type="date"
                  defaultValue={checkIn}
                  className="h-10 w-full rounded-lg border px-3 text-sm"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-neutral-600">Check-out</span>
                <input
                  name="checkOut"
                  type="date"
                  defaultValue={checkOut}
                  className="h-10 w-full rounded-lg border px-3 text-sm"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-neutral-600">Adults</span>
                  <input
                    name="adults"
                    type="number"
                    min={1}
                    defaultValue={String(adults)}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-neutral-600">Children</span>
                  <input
                    name="children"
                    type="number"
                    min={0}
                    defaultValue={String(children)}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="mt-1 inline-flex h-10 items-center justify-center rounded-lg border bg-white text-sm font-medium hover:bg-neutral-50"
              >
                Update availability
              </button>
            </form>
          </div>

          {/* Details */}
          <div className="mt-6 border-t pt-5">
            <h3 className="text-sm font-semibold">Details</h3>

            <div className="mt-3 grid gap-2 text-sm text-neutral-600">
              <div className="flex items-center justify-between">
                <span>Room type</span>
                <span className="font-medium text-neutral-900">{roomtypeName || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Free WiFi</span>
                <span className="font-medium text-neutral-900">{freeWifi ? "Yes" : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Breakfast</span>
                <span className="font-medium text-neutral-900">{includeBreakfast ? "Included" : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Coordinates</span>
                <span className="font-medium text-neutral-900">
                  {Number.isFinite(latitude) && Number.isFinite(longitude)
                    ? `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hotel ID</span>
                <span className="font-medium text-neutral-900">{hotelId}</span>
              </div>
              {sid ? (
                <div className="flex items-center justify-between">
                  <span>Short code</span>
                  <span className="font-medium text-neutral-900">{sid}</span>
                </div>
              ) : null}
              {payload?.cityId ? (
                <div className="flex items-center justify-between">
                  <span>City ID</span>
                  <span className="font-medium text-neutral-900">{payload.cityId}</span>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}