import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { SOURCE_BASE } from "@/lib/constants";

const HISTORY_FILE = path.join(SOURCE_BASE, ".mim-index", "download-history.json");

function getDownloadHistory(): any[] {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveDownloadHistory(data: any[]): void {
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  
  const history = getDownloadHistory();
  const total = history.length;
  
  // Calcular ranking por tipo de proyecto sobre TODO el historial
  const rankings: Record<string, any[]> = {};
  const types = ["mod", "resourcepack", "shader", "datapack"];
  
  types.forEach(type => {
    const counts: Record<string, { count: number, mod: any }> = {};
    // Filtrar por tipo. Si no tiene projectType, asumimos 'mod' como fallback
    history.filter(item => {
      const pType = item.projectType || "mod";
      return pType === type;
    }).forEach(item => {
      if (!counts[item.projectId]) {
        counts[item.projectId] = { count: 0, mod: item };
      }
      counts[item.projectId].count++;
    });
    
    const typeRanking = Object.values(counts).sort((a, b) => b.count - a.count);
    // Solo mostrar si hay al menos 3 elementos para hacer un Top 3
    if (typeRanking.length >= 3) {
      rankings[type] = typeRanking.slice(0, 3);
    }
  });
  
  // Paginación
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedHistory = history.slice(start, end);
  
  return NextResponse.json({ 
    history: paginatedHistory,
    rankings,
    hasMore: end < total,
    total
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const history = getDownloadHistory();

    const historyEntry = {
      projectId: body.projectId,
      title: body.title,
      author: body.author,
      iconUrl: body.iconUrl,
      categories: body.categories || [],
      _source: body._source,
      url: body.url,
      projectType: body.projectType,
      fileName: body.fileName,
      loader: body.loader,
      gameVersion: body.gameVersion,
      downloadedAt: new Date().toISOString()
    };

    // Evitar duplicados, moviendo el más reciente al principio
    const updatedHistory = [
      historyEntry,
      ...history.filter((item: any) => item.projectId !== body.projectId)
    ];

    saveDownloadHistory(updatedHistory);
    return NextResponse.json({ success: true, history: updatedHistory });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/fomo/download-history] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
