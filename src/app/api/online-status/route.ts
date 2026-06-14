import { NextResponse } from "next/server";

/** Server truth for deploy status — used when Jeff opens Jeff OS on Vercel. */
export async function GET() {
  const vercelHost = process.env.VERCEL_URL;
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const productionUrl = configured
    ? configured.replace(/\/+$/, "")
    : vercelHost
      ? `https://${vercelHost}`
      : null;

  return NextResponse.json({
    ok: true,
    isVercel: Boolean(process.env.VERCEL),
    productionUrl,
    vercelHost: vercelHost ?? null,
  });
}
