import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DRAFT_COVER_JPEG_QUALITY,
  DRAFT_COVER_MAX_LONG_EDGE,
  compressImageBlob,
  dataUrlToBlob,
} from "../compressImage";

export const DRAFT_COVERS_BUCKET = "draft-covers";

export function getDraftCoverPublicUrl(supabase: SupabaseClient, path: string): string {
  const { data } = supabase.storage.from(DRAFT_COVERS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Compress (if needed) and upload a cover blob to `{draftId}/{timestamp}.jpg`.
 * Returns the public URL for drafts.cover_image.
 */
export async function uploadDraftCover(input: {
  supabase: SupabaseClient;
  draftId: string;
  blob: Blob;
  /** Skip re-compress when already cropped/resized (e.g. ImageCropper output). */
  alreadyCompressed?: boolean;
}): Promise<string> {
  const { supabase, draftId, alreadyCompressed } = input;
  if (!draftId) throw new Error("Falta el id del draft");

  let blob = input.blob;
  if (!alreadyCompressed) {
    blob = await compressImageBlob(blob, {
      maxLongEdge: DRAFT_COVER_MAX_LONG_EDGE,
      quality: DRAFT_COVER_JPEG_QUALITY,
      mimeType: "image/jpeg",
    });
  } else if (!blob.type || blob.type === "image/png" || blob.type.startsWith("image/")) {
    // Re-encode cropped data URLs at target quality for smaller storage.
    blob = await compressImageBlob(blob, {
      maxLongEdge: DRAFT_COVER_MAX_LONG_EDGE,
      quality: DRAFT_COVER_JPEG_QUALITY,
      mimeType: "image/jpeg",
    });
  }

  const path = `${draftId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(DRAFT_COVERS_BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message || "Error al subir la portada");

  return getDraftCoverPublicUrl(supabase, path);
}

export async function uploadDraftCoverFromDataUrl(input: {
  supabase: SupabaseClient;
  draftId: string;
  dataUrl: string;
}): Promise<string> {
  const blob = dataUrlToBlob(input.dataUrl);
  return uploadDraftCover({
    supabase: input.supabase,
    draftId: input.draftId,
    blob,
    alreadyCompressed: true,
  });
}
