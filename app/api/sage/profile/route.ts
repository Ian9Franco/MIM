import { NextRequest, NextResponse } from "next/server";
import { getPrimaryMinecraftProfile } from "@/lib/minecraft/usercache";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const minecraftDir = searchParams.get("minecraftDir") || undefined;
    const profile = await getPrimaryMinecraftProfile(minecraftDir);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Minecraft profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, profile });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error resolving Minecraft profile:", errorMsg);
    return NextResponse.json(
      { success: false, error: `Failed to resolve Minecraft profile: ${errorMsg}` },
      { status: 500 }
    );
  }
}
