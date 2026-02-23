import Link from "next/link";
import Image from "next/image";

type YMALProduct = {
  id: number;
  slug: string;
  name: string;

  // existing
  price?: string;

  // ✅ new (pass these from your PDP where you map ymalProducts)
  regular_price?: string | number;
  sale_price?: string | number;
  on_sale?: boolean;

  images?: { src: string; alt?: string }[];
};

function parsePrice(input: any): number {
  const n = Number(String(input ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function getPricing(p: YMALProduct) {
  const regular = parsePrice(p.regular_price ?? p.price);
  const sale = parsePrice(p.sale_price ?? p.price);

  const onSale =
    Boolean(p.on_sale) &&
    regular > 0 &&
    sale > 0 &&
    sale < regular;

  const current = onSale ? sale : parsePrice(p.price ?? regular);
  return { onSale, current, regular };
}

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
          const { onSale, current, regular } = getPricing(p);

          return (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              className="group rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white overflow-hidden"
            >
              <div className="relative aspect-square bg-[color:var(--color-muted)] overflow-hidden">
                {img ? (
                  <Image
                    src={img}
                    alt={p.images?.[0]?.alt || p.name}
                    width={700}
                    height={700}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : null}

                {onSale ? (
                  <span className="absolute left-3 top-3 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                    Sale
                  </span>
                ) : null}
              </div>

              <div className="p-3">
                <div className="line-clamp-2 text-sm font-medium">{p.name}</div>

                {/* Price */}
                {(current || regular) ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium tabular-nums text-[color:var(--color-foreground)]">
                      ₱{(current || regular).toFixed(2)}
                    </span>

                    {onSale ? (
                      <span className="tabular-nums text-[color:var(--color-muted-foreground)] line-through">
                        ₱{regular.toFixed(2)}
                      </span>
                    ) : null}
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