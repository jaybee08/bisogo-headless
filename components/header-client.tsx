"use client";

import dynamic from "next/dynamic";

const Header = dynamic(() => import("./header").then((m) => m.Header), {
  ssr: false,
});

export default function HeaderClient() {
  return <Header />;
}