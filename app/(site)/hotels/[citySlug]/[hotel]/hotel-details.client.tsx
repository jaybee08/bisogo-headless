"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function extractHotelId(hotelParam: string) {
  const matches = hotelParam.match(/(\d{4,})/g);
  if (!matches?.length) return 0;
  return Number(matches[matches.length - 1]);
}

export default function HotelDetailsClient({
  citySlug,
  hotelParam,
  cityId,
}: {
  citySlug: string;
  hotelParam: string;
  cityId: number;
}) {
  const hotelId = useMemo(() => extractHotelId(hotelParam), [hotelParam]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!cityId || !hotelId) return;
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          cityId: String(cityId),
          hotelIds: String(hotelId),
        });

        const res = await fetch(`/api/agoda/photos?${qs.toString()}`);
        if (!res.ok) return;

        const json = await res.json();
        const arr = (json?.photos?.[String(hotelId)] ?? []) as string[];
        if (!cancelled) setPhotos(arr);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [cityId, hotelId]);

  if (!hotelId) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Hotel not found</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Invalid hotel URL.
          <br />
          <span className="text-xs text-neutral-500">{hotelParam}</span>
        </p>
        <Link className="mt-6 inline-block rounded-lg border px-4 py-2 text-sm" href="/hotels">
          Back to hotels
        </Link>
      </main>
    );
  }

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

      {loading ? <p className="mt-6 text-sm text-neutral-600">Loading photos…</p> : null}

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
      ) : !loading ? (
        <p className="mt-6 text-sm text-neutral-600">
          {cityId ? "No photos found." : "Missing cityId."}
        </p>
      ) : null}
    </main>
  );
}