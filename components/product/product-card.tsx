import Link from "next/link";
import Image from "next/image";

function parsePrice(input: any): number {
  const n = Number(String(input ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function ProductCard({
  slug,
  name,

  // existing
  price,

  // ✅ new
  regularPrice,
  salePrice,
  onSale,

  image,
}: {
  slug: string;
  name: string;

  price: string | number;

  // ✅ add these props
  regularPrice?: string | number;
  salePrice?: string | number;
  onSale?: boolean;

  image?: { url?: string | null; alt?: string | null };
}) {
  const regular = parsePrice(regularPrice ?? price);
  const sale = parsePrice(salePrice ?? price);

  const isOnSale =
    Boolean(onSale) &&
    regular > 0 &&
    sale > 0 &&
    sale < regular;

  const current = isOnSale ? sale : parsePrice(price);

  return (
    <Link href={`/product/${slug}`} className="group block">
      <div className="relative aspect-square w-full overflow-hidden bg-[color:var(--color-muted)]">
        {image?.url ? (
          <Image
            src={image.url}
            alt={image.alt || name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : null}

        {isOnSale ? (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
            Sale
          </span>
        ) : null}
      </div>

      <div className="pt-3">
        <div className="text-sm font-medium leading-snug">{name}</div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium tabular-nums text-[color:var(--color-foreground)]">
            ₱{(current || regular).toFixed(2)}
          </span>

          {isOnSale ? (
            <span className="tabular-nums text-[color:var(--color-muted-foreground)] line-through">
              ₱{regular.toFixed(2)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}