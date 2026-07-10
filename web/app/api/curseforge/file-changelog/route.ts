import { NextRequest, NextResponse } from "next/server";

const CURSEFORGE_API = "https://api.curseforge.com/v1";

export async function GET(req: NextRequest) {
  const apiKey = process.env.CURSEFORGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "CURSEFORGE_API_KEY no configurada" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const fileId = searchParams.get("fileId");

  if (!projectId || !fileId) {
    return NextResponse.json({ error: "Missing projectId or fileId" }, { status: 400 });
  }

  try {
    const res = await fetch(`${CURSEFORGE_API}/mods/${projectId}/files/${fileId}/changelog`, {
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `CurseForge API Error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ changelog: data.data || "" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load changelog" }, { status: 500 });
  }
}
