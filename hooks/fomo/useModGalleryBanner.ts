"use client";

import { useEffect, useState } from "react";
import {
  fetchFirstGalleryUrl,
  getCachedGalleryBanner,
  getFirstGalleryUrl,
} from "@/lib/fomo/fomoModBanner";

/** Primera imagen de galería: en el mod o vía API (con caché). */
export function useModGalleryBanner(
  mod: {
    projectId?: string;
    _source?: string;
    gallery?: (string | { url?: string } | null)[] | null;
  } | null | undefined
): string | undefined {
  const fromMod = mod ? getFirstGalleryUrl(mod.gallery) : undefined;
  const [fetched, setFetched] = useState<string | undefined>(() =>
    mod?.projectId && !fromMod
      ? getCachedGalleryBanner(mod.projectId, mod._source)
      : undefined
  );

  useEffect(() => {
    if (!mod?.projectId || fromMod) return;
    const cached = getCachedGalleryBanner(mod.projectId, mod._source);
    if (cached) {
      setFetched(cached);
      return;
    }
    let cancelled = false;
    fetchFirstGalleryUrl(mod.projectId, mod._source).then((url) => {
      if (!cancelled && url) setFetched(url);
    });
    return () => {
      cancelled = true;
    };
  }, [mod?.projectId, mod?._source, fromMod]);

  return fromMod || fetched;
}
