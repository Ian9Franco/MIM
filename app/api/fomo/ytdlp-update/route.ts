/**
 * /api/fomo/ytdlp-update — GET (check) & POST (update)
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  → Returns current version, latest version, and whether an update is needed.
 * POST → Triggers a binary download + safe replacement.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { checkYtdlpUpdate, updateYtdlp } from "@/lib/ytdlp/updater";
import { withApiGuard } from "@/lib/apiGuard";

export const GET = withApiGuard(
  {},
  async () => {

  try {
    const info = await checkYtdlpUpdate();
    return NextResponse.json(info);
  } catch (err: any) {
    console.error("[ytdlp-update] Check error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to check yt-dlp version" },
      { status: 500 }
    );
  }

  }
);

export const POST = withApiGuard(
  {},
  async () => {

  try {
    const result = await updateYtdlp();
    if (result.success) {
      return NextResponse.json({
        success: true,
        newVersion: result.newVersion,
        message: `yt-dlp actualizado a ${result.newVersion}`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || "Update failed" },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("[ytdlp-update] Update error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update yt-dlp" },
      { status: 500 }
    );
  }

  }
);
