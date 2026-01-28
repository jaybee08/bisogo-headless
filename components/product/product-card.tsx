import Link from "next/link";
import Image from "next/image";

export function ProductCard({
  slug,
  name,
  price,
  image
}: {
  slug: string;
  name: string;
  price: string | number;
  image?: { url?: string | null; alt?: string | null };
}) {
  const p = typeof price === "number" ? price.toFixed(2) : price;
  return (
    <Link
      href={`/product/${slug}`}
      className="group block"
    >
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
      </div>
      <div className="pt-3">
        <div className="text-sm font-medium leading-snug">{name}</div>
        <div className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">{String(p).startsWith("₱") ? p : `₱${p}`}</div>
      </div>
    </Link>
  );
}
