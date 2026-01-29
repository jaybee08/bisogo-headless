"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ShoppingBag, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCartUI } from "@/lib/cart/ui";
import { useEffect, useState } from "react";

const nav = [
  { href: "/blog", label: "Travel" },
  { href: "#tips", label: "Tips" },
  { href: "#local", label: "Local Finds" },
  { href: "/shop", label: "Shop" },
  { href: "#deals", label: "Deals" },
];

export function Header() {
  const pathname = usePathname();
  const { data } = useSession();
  const hasHydrated = useCart((s) => s.hasHydrated);
  const count = useCart((s) => (hasHydrated ? s.count() : 0));  

  // ✅ prevent hydration mismatch from persisted cart count
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--color-border)] bg-white/70 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/brand/bisogo-logo-520x140.svg"
              alt="Bisogo"
              width={130}
              height={30}
              priority
            />
          </Link>
          <nav className="hidden items-center gap-5 md:flex">
            {nav.map((n) => {
              const active =
                pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "text-sm text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]",
                    active && "text-[color:var(--color-foreground)]"
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {data?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={data.user.image || ""}
                      alt={data.user.name || "User"}
                    />
                    <AvatarFallback>
                      {(data.user.name || data.user.email || "U")
                        .slice(0, 1)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5 text-xs text-[color:var(--color-muted-foreground)]">
                  Signed in as
                  <br />
                  <span className="font-medium text-[color:var(--color-foreground)]">
                    {data.user.name || data.user.email}
                  </span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">Account</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/cart">Cart</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" className="hidden sm:inline-flex">
                <Link href="/account" scroll={false}>
                <User className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
          )}

          {/* ✅ Use a real button here (no href=""), and open drawer on click */}
          <Button asChild variant="ghost" className="relative h-9 w-9 p-0">
          <Link href="/cart" aria-label="Cart" className="inline-flex items-center justify-center">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--color-primary)] px-1 text-xs font-medium text-[color:var(--color-primary-foreground)]">
                {count}
              </span>
            ) : null}
          </Link>
        </Button>
        </div>
      </div>
    </header>
  );
}