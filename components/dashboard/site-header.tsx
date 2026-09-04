"use client";

// components/dashboard/site-header.tsx
//
// The band across the top of every page: the college logo, the name
// of the tool, and links to the two dashboards.
//
// "use client" because it highlights whichever page you are on, and
// that means reading the current address.

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/overview", label: "Overview" },
  { href: "/faculty", label: "Faculty report" },
];

export function SiteHeader() {
  // The address of the page currently being viewed
  const pathname = usePathname();

  return (
    <header className="print:hidden">
      {/* The red band carrying the logo */}
      <div style={{ backgroundColor: "#E0241B" }}>
        <div className="relative mx-auto flex max-w-5xl items-center px-6 py-5">
          {/* Logo pinned to the left */}
          <Link
            href="/"
            className="shrink-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            aria-label="Home"
          >
            <Image
              src="/ucb_logo.png"
              alt="University College of Bahrain"
              width={1024}
              height={486}
              priority
              className="h-14 w-auto sm:h-16"
            />
          </Link>

          {/* Title centred across the band. On small screens it sits
              beside the logo instead, so nothing overlaps. */}
          <div className="ml-4 min-w-0 sm:absolute sm:inset-x-0 sm:ml-0 sm:text-center">
            <p className="truncate text-base font-semibold text-white sm:text-lg">
              Teaching Evaluation Dashboards
            </p>
            <p className="truncate text-xs text-white/75">
              UK Professional Standards Framework
            </p>
          </div>
        </div>
      </div>

      {/* A quieter strip below it for the navigation */}
      <nav className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl gap-1 px-6">
          {LINKS.map((link) => {
            // Highlight the link for the page we are on
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  "-mb-px border-b-2 px-3 py-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 " +
                  (active
                    ? "border-[#E0241B] font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground")
                }
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
