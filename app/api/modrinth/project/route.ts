import { NextRequest, NextResponse } from "next/server";

const MODRINTH_API = "https://api.modrinth.com/v2";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "User-Agent": "MIM-App/1.0 (contact@mim.local)",
  };
  if (process.env.MODRINTH_API_KEY) {
    headers["Authorization"] = process.env.MODRINTH_API_KEY;
  }

  try {
    const res = await fetch(`${MODRINTH_API}/project/${encodeURIComponent(projectId)}`, { headers });
    if (!res.ok) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const data = await res.json();
    return NextResponse.json({ body: data.body });
  } catch (e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
