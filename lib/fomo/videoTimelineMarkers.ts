export type VideoTimelineKind = "chapter" | "cut";

export type VideoTimelineMarker = {
  t: number;
  label: string;
  kind: VideoTimelineKind;
  spoiler: boolean;
};

const TIMESTAMP_LINE =
  /^\s*(?:\(?(\d{1,2}):)?(\d{1,2}):(\d{2})\)?\s*(?:[-–—|:]\s*)?(.+?)\s*$/;

function isSpoilerLabel(label: string): boolean {
  return /spoiler/i.test(label);
}

export function parseClockToSeconds(hours: string | undefined, minutes: string, seconds: string): number {
  const h = hours ? Number(hours) : 0;
  const m = Number(minutes);
  const s = Number(seconds);
  if (![h, m, s].every(Number.isFinite)) return -1;
  return h * 3600 + m * 60 + s;
}

export function parseDescriptionTimestamps(text: string): VideoTimelineMarker[] {
  if (!text) return [];
  const markers: VideoTimelineMarker[] = [];
  const seen = new Set<number>();

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(TIMESTAMP_LINE);
    if (!match) continue;
    const t = parseClockToSeconds(match[1], match[2], match[3]);
    if (t < 0) continue;
    const label = match[4].replace(/^[\s\-–—:|]+/, "").replace(/\s+/g, " ").trim();
    if (!label || label.length > 90) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    markers.push({ t, label, kind: "cut", spoiler: isSpoilerLabel(label) });
  }

  return markers.sort((a, b) => a.t - b.t);
}

export function chaptersFromYtDlp(raw: unknown): VideoTimelineMarker[] {
  if (!Array.isArray(raw)) return [];
  const markers: VideoTimelineMarker[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const t = Number(row.start_time ?? row.startTime);
    const label = String(row.title || row.label || "").trim();
    if (!Number.isFinite(t) || t < 0 || !label) continue;
    markers.push({ t, label, kind: "chapter", spoiler: isSpoilerLabel(label) });
  }
  return markers.sort((a, b) => a.t - b.t);
}

export function mergeTimelineMarkers(
  chapters: VideoTimelineMarker[],
  cuts: VideoTimelineMarker[],
  proximitySeconds = 5,
): VideoTimelineMarker[] {
  const merged = [...chapters];
  for (const cut of cuts) {
    const nearChapter = chapters.some((chapter) => Math.abs(chapter.t - cut.t) <= proximitySeconds);
    if (nearChapter) continue;
    merged.push(cut);
  }
  return merged.sort((a, b) => a.t - b.t);
}
