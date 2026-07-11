import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const headers: Record<string, string> = {
      "User-Agent": "MIM-Web-App/1.0 (contact@mim.local)",
      "Content-Type": "application/json"
    };
    if (process.env.MODRINTH_API_KEY) {
      headers.Authorization = process.env.MODRINTH_API_KEY;
    }

    const res = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}`, {
      headers,
      next: { revalidate: 1800 } // Cache for 30 minutes
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Modrinth error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    if (data.organization) {
      try {
        const orgRes = await fetch(`https://api.modrinth.com/v3/organization/${encodeURIComponent(data.organization)}`, {
          headers,
          next: { revalidate: 1800 } // Cache organization for 30 minutes
        });
        if (orgRes.ok) {
          data.organization_info = await orgRes.json();
        }
      } catch (err: any) {
        console.error("[Modrinth Project Proxy] Organization fetch error:", err.message);
      }
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
