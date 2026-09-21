/** Client-side image resize + JPEG compression for uploads. */

export const DRAFT_COVER_MAX_LONG_EDGE = 1440;
export const DRAFT_COVER_JPEG_QUALITY = 0.75;
export const DRAFT_COVER_MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB raw pick
export const DRAFT_COVER_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

export function isAllowedCoverImageType(type: string): boolean {
  const t = (type || "").toLowerCase();
  if (!t) return true; // some mobile browsers omit type
  return t.startsWith("image/") && !t.includes("svg");
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  if (!base64) throw new Error("Data URL inválida");
  const mimeMatch = /data:([^;]+)/.exec(header || "");
  const mime = mimeMatch?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

export type CompressImageOptions = {
  maxLongEdge?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
};

/**
 * Resize so the long edge is at most `maxLongEdge`, then encode as JPEG/WebP.
 */
export async function compressImageBlob(
  input: Blob,
  options: CompressImageOptions = {},
): Promise<Blob> {
  const maxLongEdge = options.maxLongEdge ?? DRAFT_COVER_MAX_LONG_EDGE;
  const quality = options.quality ?? DRAFT_COVER_JPEG_QUALITY;
  const mimeType = options.mimeType ?? "image/jpeg";

  const img = await loadImageFromBlob(input);
  const { naturalWidth: w, naturalHeight: h } = img;
  if (!w || !h) throw new Error("Imagen vacía o corrupta");

  const longEdge = Math.max(w, h);
  const scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1;
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(img, 0, 0, outW, outH);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mimeType, quality);
  });
  if (!blob) throw new Error("No se pudo comprimir la imagen");
  return blob;
}

export async function compressImageFile(
  file: File,
  options?: CompressImageOptions,
): Promise<Blob> {
  return compressImageBlob(file, options);
}
