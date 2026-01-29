import Link from "next/link";
import Image from "next/image";

type YMALProduct = {
  id: number;
  slug: string;
  name: string;
  price?: string;
  images?: { src: string; alt?: string }[];
};

export function Ymal({ products }: { products: YMALProduct[] }) {
  if (!products?.length) return null;

  return (
    <div className="mt-10">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">You may also like</h2>
        <Link href="/shop" className="text-sm underline-offset-4 hover:underline">
          View all
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.slice(0, 8).map((p) => {
          const img = p.images?.[0]?.src || null;
          return (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              className="group rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white overflow-hidden"
            >
              <div className="aspect-square bg-[color:var(--color-muted)] overflow-hidden">
                {img ? (
                  <Image
                    src={img}
                    alt={p.images?.[0]?.alt || p.name}
                    width={700}
                    height={700}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : null}
              </div>
              <div className="p-3">
                <div className="line-clamp-2 text-sm font-medium">{p.name}</div>
                {p.price ? (
                  <div className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
                    ₱{Number(String(p.price).replace(/[^0-9.]/g, "") || 0).toFixed(2)}
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}