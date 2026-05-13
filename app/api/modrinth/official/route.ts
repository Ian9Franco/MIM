import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://api.modrinth.com/v3/user/modrinth/collections", {
      headers: {
        "User-Agent": "MIM-App/1.0 (contact@mim.local)",
        "Content-Type": "application/json"
      },
      next: { revalidate: 3600 } // Cache the response for 1 hour to respect rate-limiting
    });

    if (!res.ok) {
      console.error("[Modrinth Official Proxy] Modrinth API returned error status:", res.status);
      return NextResponse.json({ error: `Modrinth API error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[Modrinth Official Proxy] Fetch failed:", err.message);
    return NextResponse.json({ error: err.message || "Failed to fetch official collections" }, { status: 500 });
  }
}
