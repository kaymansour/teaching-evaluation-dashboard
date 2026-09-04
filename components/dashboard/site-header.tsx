// components/dashboard/site-header.tsx
//
// The red band across the top of every page, carrying the college
// logo and the links to the two dashboards.

import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b" style={{ backgroundColor: "#E0241B" }}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-6 px-6 py-4">
        <Link href="/" className="shrink-0">
          <Image
            src="/ucb_logo.png"
            alt="University College of Bahrain"
            width={1024}
            height={486}
            priority
            className="h-11 w-auto"
          />
        </Link>

        <nav className="flex gap-1 text-sm">
          <Link
            href="/overview"
            className="rounded px-3 py-1.5 text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Overview
          </Link>
          <Link
            href="/faculty"
            className="rounded px-3 py-1.5 text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Faculty
          </Link>
        </nav>
      </div>
    </header>
  );
}