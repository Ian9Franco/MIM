import path from "path";
import { UNKNOWN } from "./types";

export function normalizeVersion(version: string): string {
  if (!version || version === "unknown") return version;
  let clean = version.trim()
    .replace(/^v/i, "")
    .replace(/[-+]?(fabric|forge|neoforge|quilt|snapshot|alpha|beta|dev|local|all|release|final|pre)/gi, "")
    .replace(/[-+]?(mc)?1\.(1[6-9]|2\d)(\.\d+)?/gi, "")
    .replace(/[_-]/g, ".")
    .replace(/[^0-9.]/g, "")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
  const parts = clean.split(".");
  return parts.slice(0, 4).join(".") || version;
}

export function extractVersionFromFileName(fileName: string): { name: string; version: string } {
  const patterns = [
    /^(.+?)[\-\_](\d+(?:\.\d+)*(?:[\-\_][a-zA-Z0-9]+)*)\.jar$/,
    /^(.+?)[\-\_]v?(\d+(?:\.\d+)*)\.jar$/,
    /^(.+?)[\-\_]([\d\.]+(?:[a-zA-Z0-9\-_]*)?)\.jar$/
  ];
  for (const p of patterns) {
    const m = fileName.match(p);
    if (m) return { name: m[1].replace(/[\-_]/g, " "), version: normalizeVersion(m[2]) };
  }
  return { name: fileName, version: UNKNOWN };
}

export function isValidImage(buffer: Buffer): boolean {
  const png = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
  const jpeg = Buffer.from([0xFF, 0xD8, 0xFF]);
  return buffer.slice(0, 4).equals(png) || buffer.slice(0, 3).equals(jpeg);
}
