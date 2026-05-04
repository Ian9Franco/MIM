import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const COLLECTIONS_FILE = path.join(process.cwd(), "mim-collections.json");

function getLocalCollections() {
  if (fs.existsSync(COLLECTIONS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(COLLECTIONS_FILE, "utf-8"));
    } catch (e) {}
  }
  return [];
}

function saveLocalCollections(data: any) {
  fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  const collections = getLocalCollections();
  return NextResponse.json({ collections });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const collections = getLocalCollections();

    if (body.action === "create") {
      const newColl = {
        id: "local_" + Date.now(),
        name: body.name || "Nueva Colección",
        description: body.description || "",
        projects: [],
        iconUrl: null,
        isLocal: true,
      };
      collections.push(newColl);
      saveLocalCollections(collections);
      return NextResponse.json({ success: true, collection: newColl });
    }

    if (body.action === "add_project") {
      const coll = collections.find((c: any) => c.id === body.collectionId);
      if (!coll) return NextResponse.json({ error: "Colección no encontrada" }, { status: 404 });
      
      if (!coll.projects.find((p: any) => p.projectId === body.project.projectId)) {
        coll.projects.push(body.project);
        coll.projectCount = coll.projects.length;
        saveLocalCollections(collections);
      }
      return NextResponse.json({ success: true });
    }

    if (body.action === "remove_project") {
      const coll = collections.find((c: any) => c.id === body.collectionId);
      if (!coll) return NextResponse.json({ error: "Colección no encontrada" }, { status: 404 });
      
      coll.projects = coll.projects.filter((p: any) => p.projectId !== body.projectId);
      coll.projectCount = coll.projects.length;
      saveLocalCollections(collections);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
