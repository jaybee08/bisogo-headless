import Link from "next/link";
import Image from "next/image";
import { formatDate, stripHtml } from "@/lib/utils";

export function PostCard({
  slug,
  title,
  excerpt,
  date,
  image
}: {
  slug: string;
  title: string;
  excerpt?: string | null;
  date?: string | null;
  image?: { url?: string | null; alt?: string | null };
}) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="group block"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[color:var(--color-muted)]">
        {image?.url ? (
          <Image
            src={image.url}
            alt={image.alt || title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(min-width: 1024px) 33vw, 100vw"
          />
        ) : null}
      </div>
      <div className="pt-3">
        <div className="text-sm font-medium leading-snug">{title}</div>
        {date ? <div className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">{formatDate(date)}</div> : null}
        {excerpt ? (
          <div className="mt-2 line-clamp-2 text-sm text-[color:var(--color-muted-foreground)]">{stripHtml(excerpt)}</div>
        ) : null}
      </div>
    </Link>
  );
}
