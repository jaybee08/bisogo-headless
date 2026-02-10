import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--color-border)]">
      <div className="container py-10 text-sm text-[color:var(--color-muted-foreground)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-medium text-[color:var(--color-foreground)]">Bisogo</div>
            <div className="mt-1">Stories, guides, and thoughtfully-made finds.</div>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/blog" className="hover:underline underline-offset-4">Blog</Link>
            <Link href="/shop" className="hover:underline underline-offset-4">Shop</Link>
            <Link href="/p/about" className="hover:underline underline-offset-4">About</Link>
          </div>
        </div>
        <div className="mt-8 text-xs">© {new Date().getFullYear()} Bisogo. All rights reserved.</div>
      </div>
    </footer>
  );
}
