"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ShoppingBag, User, Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

// shadcn Sheet (mobile menu)
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--color-border)] bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      {/* make this relative so mobile logo can be absolutely centered */}
      <div className="container relative flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* MOBILE: Center logo (does NOT affect desktop) */}
        <Link
          href="/"
          className="sm:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center"
          aria-label="Bisogo home"
        >
          <Image
            src="/brand/bisogo-logo-520x140.svg"
            alt="Bisogo"
            width={150}
            height={40}
            priority
            className="block h-10 w-auto"
          />
        </Link>

        {/* Left */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          {/* Mobile menu button */}
          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" aria-label="Open menu" className="h-9 w-9 p-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="w-[320px]">
                <SheetHeader>
                  <SheetTitle className="sr-only">Menu</SheetTitle>
                </SheetHeader>

                <div className="flex items-center gap-3 border-b pb-4">
                  <Image
                    src="/brand/bisogo-logo-520x140.svg"
                    alt="Bisogo"
                    width={170}
                    height={44}
                    className="block h-10 w-auto"
                    priority
                  />
                </div>

                <nav className="mt-4 grid gap-2">
                  {nav.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      className="rounded-md px-3 py-2 text-base font-medium hover:bg-[color:var(--color-muted)]"
                    >
                      {n.label}
                    </Link>
                  ))}
                </nav>

                <div className="mt-6 border-t pt-4">
                  {data?.user ? (
                    <>
                      <Link
                        href="/account"
                        className="block rounded-md px-3 py-2 text-base font-medium hover:bg-[color:var(--color-muted)]"
                      >
                        Account
                      </Link>
                      <Link
                        href="/cart"
                        className="mt-2 flex items-center justify-between rounded-md px-3 py-2 text-base font-medium hover:bg-[color:var(--color-muted)]"
                      >
                        <span>Cart</span>
                        {mounted && count > 0 ? (
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[color:var(--color-foreground)] px-2 text-xs font-semibold text-white">
                            {count}
                          </span>
                        ) : null}
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/account"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium hover:bg-[color:var(--color-muted)]"
                    >
                      <User className="h-4 w-4" />
                      Login
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* DESKTOP: Normal left logo */}
          <Link href="/" className="hidden sm:inline-flex items-center">
            <Image
              src="/brand/bisogo-logo-520x140.svg"
              alt="Bisogo"
              width={170}
              height={44}
              priority
              className="block h-10 w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 md:flex">
            {nav.map((n) => {
              const isHash = n.href.startsWith("#");
              const active = isHash
                ? false
                : pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));

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

        {/* Right */}
        <div className="flex items-center gap-2">
          {data?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={data.user.image || ""} alt={data.user.name || "User"} />
                    <AvatarFallback>
                      {(data.user.name || data.user.email || "U").slice(0, 1).toUpperCase()}
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
            <Button asChild variant="outline" className="hidden sm:inline-flex rounded-full">
              <Link href="/account" scroll={false}>
                <User className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
          )}

          <Button asChild variant="ghost" className="relative h-9 w-9 p-0">
            <Link href="/cart" aria-label="Cart" className="inline-flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
              {mounted && count > 0 ? (
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