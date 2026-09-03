// app/page.tsx
//
// The landing page, at /
// Links to the two dashboards the employer asked for.

import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Teaching evaluation dashboards
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Student evaluation results for four semesters, mapped to the UK
        Professional Standards Framework.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href="/overview" className="block">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Institutional overview</CardTitle>
              <CardDescription>
                How the university is performing overall, and which courses
                and questions need attention.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-muted-foreground">
                Open overview
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/faculty" className="block">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Individual faculty report</CardTitle>
              <CardDescription>
                How one faculty member is performing, and where improvement
                is required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-muted-foreground">
                Open faculty report
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}