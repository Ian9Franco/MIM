import { useState, useEffect, useCallback, useMemo } from "react";
import type { ModHit, VersionEntry } from "@/lib/types";

export function useFomoOverlayManager(mod: ModHit, versions: VersionEntry[], hideVersions: boolean) {
  const [activeTab, setActiveTab] = useState<"description" | "versions" | "dependencies">(hideVersions ? "description" : "versions");
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [depDownloading, setDepDownloading] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedBody, setTranslatedBody] = useState<string | null>(null);
  const [depSearchQuery, setDepSearchQuery] = useState("");
  const [followedAuthors, setFollowedAuthors] = useState<string[]>([]);
  const [followedMods, setFollowedMods] = useState<any[]>([]);

  useEffect(() => {
    const load = () => {
      try {
        setFollowedAuthors(JSON.parse(localStorage.getItem("mim_followed_authors") || "[]"));
        setFollowedMods(JSON.parse(localStorage.getItem("mim_followed_mods") || "[]"));
      } catch {}
    };
    load();
    window.addEventListener("mim-followed-authors-changed", load);
    window.addEventListener("mim-followed-mods-changed", load);
    return () => { window.removeEventListener("mim-followed-authors-changed", load); window.removeEventListener("mim-followed-mods-changed", load); };
  }, []);

  const toggleFollowAuthor = useCallback((author: string) => {
    const next = followedAuthors.includes(author) ? followedAuthors.filter(a => a !== author) : [...followedAuthors, author];
    setFollowedAuthors(next);
    localStorage.setItem("mim_followed_authors", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("mim-followed-authors-changed", { detail: next }));
  }, [followedAuthors]);

  const toggleFollowMod = useCallback((m: ModHit) => {
    const exists = followedMods.some(x => x.projectId === m.projectId);
    const next = exists ? followedMods.filter(x => x.projectId !== m.projectId) : [...followedMods, m];
    setFollowedMods(next);
    localStorage.setItem("mim_followed_mods", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("mim-followed-mods-changed", { detail: next }));
  }, [followedMods]);

  const allDependencies = useMemo(() => {
    const ids = new Set(versions.flatMap(v => v.dependencies || []).map(d => d.projectId));
    return Array.from(ids).map(id => versions.flatMap(v => v.dependencies || []).find(d => d.projectId === id)!);
  }, [versions]);

  const handleTranslate = async () => {
    if (!mod.body || isTranslating) return;
    if (translatedBody) { setTranslatedBody(null); return; }
    setIsTranslating(true);
    try {
      const text = mod.body.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/!\[([^\]]*)\]\([^)]*\)/g, "");
      const temp = document.createElement("div"); temp.innerHTML = text;
      temp.querySelectorAll("a, img, script, style, code").forEach(el => el.remove());
      const full = temp.innerText.trim();
      if (!full) throw new Error();
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(full.substring(0, 450))}&langpair=en|es`);
      if (res.ok) { const d = await res.json(); setTranslatedBody(d.responseData?.translatedText || null); }
    } catch {} finally { setIsTranslating(false); }
  };

  return { activeTab, setActiveTab, expandedVersion, setExpandedVersion, depDownloading, setDepDownloading, isTranslating, translatedBody, setTranslatedBody, depSearchQuery, setDepSearchQuery, followedAuthors, followedMods, toggleFollowAuthor, toggleFollowMod, allDependencies, handleTranslate };
}
