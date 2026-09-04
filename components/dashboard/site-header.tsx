"use client";

// components/dashboard/site-header.tsx
//
// The band across the top of every page, following the college's own
// house style: a thin navy strip, then a white header carrying the
// logo and the navigation. Red is used only as an accent.
//
// "use client" because it highlights whichever page you are on, and
// that means reading the current address.

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Colours taken from the college website
const NAVY = "#171F32";
const RED = "#CF162D";

const LINKS = [
  { href: "/overview", label: "Institutional overview" },
  { href: "/faculty", label: "Faculty report" },
];

export function SiteHeader() {
  // The address of the page currently being viewed
  const pathname = usePathname();

  return (
    <header className="print:hidden">
      {/* ---------- Thin navy strip ---------- */}
      <div style={{ backgroundColor: NAVY }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-2">
          <p className="truncate text-xs text-white/80">
            Quality Assurance &middot; Teaching Evaluation
          </p>
        </div>
      </div>

      {/* ---------- White header ---------- */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          {/* Logo and title, left */}
          <Link
            href="/"
            className="flex items-center gap-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ outlineColor: RED }}
          >
            <Image
              src="/ucb_logo.png"
              alt="University College of Bahrain"
              width={1024}
              height={486}
              priority
              className="h-12 w-auto sm:h-14"
            />
            <span
              className="hidden border-l pl-4 text-sm font-medium sm:block"
              style={{ color: NAVY }}
            >
              Teaching Evaluation
              <span className="block text-xs font-normal text-muted-foreground">
                Dashboards
              </span>
            </span>
          </Link>

          {/* Navigation, right */}
          <nav className="flex gap-1">
            {LINKS.map((link) => {
              // Mark the link for the page we are on
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "rounded px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 " +
                    (active
                      ? "font-medium text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground")
                  }
                  style={active ? { backgroundColor: RED } : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
