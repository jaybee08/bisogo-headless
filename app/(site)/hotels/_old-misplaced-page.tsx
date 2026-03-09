import Link from "next/link";

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
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return "http://localhost:3000";
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
  return (json?.photos?.[String(hotelId)] ?? []) as string[];
}

type PageProps = {
  params?: { citySlug?: string; hotel?: unknown };
  searchParams?: { cityId?: string };
};

export default async function HotelDetailsPage(props: PageProps) {
  const citySlug = props?.params?.citySlug ?? "city";
  const rawHotelParam = props?.params?.hotel;
  const hotelId = extractHotelId(rawHotelParam);
  const cityId = Number(props?.searchParams?.cityId || 0);

  // ✅ hard guard: never throw
  if (!hotelId) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Hotel not found</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Invalid hotel URL.
          <br />
          <span className="text-xs text-neutral-500">
            citySlug: {JSON.stringify(citySlug)} <br />
            hotel param: {JSON.stringify(rawHotelParam)}
          </span>
        </p>
        <Link className="mt-6 inline-block rounded-lg border px-4 py-2 text-sm" href="/hotels">
          Back to hotels
        </Link>
      </main>
    );
  }

  const photos = cityId ? await getPhotos(cityId, hotelId) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hotel #{hotelId}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            City: <span className="font-medium">{citySlug}</span>
          </p>
        </div>

        <Link href="/hotels" className="rounded-lg border px-4 py-2 text-sm font-medium">
          Back
        </Link>
      </div>

      {photos.length > 0 ? (
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {photos.slice(0, 6).map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className="aspect-square w-full rounded-2xl object-cover"
              loading="lazy"
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-neutral-600">
          {cityId ? "No photos found." : "Missing cityId. Go back and open this hotel from the list."}
        </p>
      )}
    </main>
  );
}