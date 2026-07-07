"use client";

import { useCallback, useEffect, useState } from "react";
import type { ModHit } from "../components/SpotlightMarquees";
import type { DraftAddResult } from "../components/DraftPickerModal";
import { mockNewestMods, mockUpdatedMods } from "../lib/mockData";
import { supabase } from "../lib/supabaseClient";
import type { CollectionItem } from "../app/types";

export const resizeAndCompressImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > height && width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const fetchDraftIcons = async (projectIds: string[]): Promise<Record<string, string>> => {
  const ids = projectIds.filter(Boolean);
  if (!ids.length) return {};
  try {
    const res = await fetch(`https://api.modrinth.com/v2/projects?ids=${JSON.stringify(ids)}`);
    if (!res.ok) return {};
    const data = await res.json();
    return data.reduce((acc: Record<string, string>, project: any) => {
      if (project.icon_url) acc[project.id] = project.icon_url;
      return acc;
    }, {});
  } catch (err) {
    console.error("Error batch fetching project icons:", err);
    return {};
  }
};

const DEFAULT_CHANNELS = [
  "https://www.youtube.com/@EnderVerseMC",
  "https://www.youtube.com/@KreksuMinecraft",
  "https://www.youtube.com/@NoxusMods",
  "https://www.youtube.com/@sir_color",
  "https://www.youtube.com/@Wero_lovernite",
];

const FALLBACK_MODRINTH_COLLECTIONS: CollectionItem[] = [
  {
    id: "fallback-modrinth-mobile",
    name: "Modrinth Featured",
    description: "Selección local de mods destacados para mantener Spotlight visible sin depender del cache de desarrollo.",
    projectCount: mockUpdatedMods.length,
    iconUrl: mockUpdatedMods[0]?.iconUrl,
    source: "modrinth",
    previewIcons: mockUpdatedMods.map((m) => m.iconUrl).filter(Boolean) as string[],
    mods: mockUpdatedMods,
  },
];

const FALLBACK_CURSEFORGE_COLLECTIONS: CollectionItem[] = [
  {
    id: "fallback-curseforge-mobile",
    name: "CurseForge Picks",
    description: "Picks editoriales de respaldo para el carrusel mobile.",
    projectCount: mockNewestMods.length,
    iconUrl: mockNewestMods[0]?.iconUrl,
    source: "curseforge",
    previewIcons: mockNewestMods.map((m) => m.iconUrl).filter(Boolean) as string[],
    mods: mockNewestMods.map((m) => ({ ...m, _source: "curseforge" })),
  },
];

function normalizeFavorite(fav: any): ModHit {
  let meta: any = {};
  try {
    meta = fav.summary && fav.summary.trim().startsWith("{") ? JSON.parse(fav.summary) : {};
  } catch {}
  const projectId = fav.project_id || fav.mod_id || fav.id;
  const projectType = fav.project_type || meta.project_type || fav.content_type || "mod";
  return {
    projectId,
    title: fav.name || fav.mod_name || projectId,
    description: fav.description || meta.description || fav.summary || "",
    iconUrl: fav.icon_url,
    author: fav.author || "Comunidad",
    projectType,
    categories: fav.categories || meta.categories || [],
    url: fav.url || meta.url || `https://modrinth.com/${projectType}/${projectId}`,
    _source: fav.platform || fav.source || "modrinth",
  };
}

function normalizeContentType(mod: ModHit | any): string {
  const raw = String(mod.projectType || mod.project_type || mod.content_type || "mod").toLowerCase();
  if (raw === "resourcepack" || raw === "resource-pack" || raw === "texture" || raw === "texture-pack") return "resourcepack";
  if (raw === "shader" || raw === "shaderpack") return "shader";
  if (raw === "datapack" || raw === "data-pack") return "datapack";
  return "mod";
}

function inferSide(contentType: string, details?: any): "client" | "server" | "both" {
  if (contentType === "resourcepack" || contentType === "shader") return "client";
  if (contentType === "datapack") return "server";
  const client = details?.client_side;
  const server = details?.server_side;
  if (client === "required" && server !== "required") return "client";
  if (server === "required" && client !== "required") return "server";
  return "both";
}

function normalizeLoader(loader: string) {
  const l = loader.toLowerCase();
  if (l === "neoforge") return "neoforge";
  if (l === "quilt") return "quilt";
  if (l === "fabric") return "fabric";
  if (l === "any" || l === "all") return "";
  return "forge";
}

export function useHomeController() {
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedMod, setSelectedMod] = useState<ModHit | null>(null);
  const [selectedModDetails, setSelectedModDetails] = useState<any>(null);
  const [selectedModDeps, setSelectedModDeps] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [modalTab, setModalTab] = useState<"summary" | "desc" | "versions" | "deps">("summary");
  const [modStack, setModStack] = useState<any[]>([]);
  const [activeStackIndex, setActiveStackIndex] = useState(-1);

  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverType, setDiscoverType] = useState("mod");
  const [discoverVersion, setDiscoverVersion] = useState("1.20.1");
  const [discoverLoader, setDiscoverLoader] = useState("fabric");
  const [discoverResults, setDiscoverResults] = useState<ModHit[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverTotal, setDiscoverTotal] = useState(0);
  const [discoverSource, setDiscoverSource] = useState<"modrinth" | "curseforge">("modrinth");
  const [discoverError, setDiscoverError] = useState("");

  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const [showcaseChannels, setShowcaseChannels] = useState<string[]>([]);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [userFavorites, setUserFavorites] = useState<any[]>([]);
  const [userDrafts, setUserDrafts] = useState<any[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);

  const [updatedMods, setUpdatedMods] = useState<ModHit[]>(mockUpdatedMods);
  const [newestMods, setNewestMods] = useState<ModHit[]>(mockNewestMods);
  const [modrinthFeatured, setModrinthFeatured] = useState<CollectionItem[]>(FALLBACK_MODRINTH_COLLECTIONS);
  const [curseForgeFeatured, setCurseForgeFeatured] = useState<CollectionItem[]>(FALLBACK_CURSEFORGE_COLLECTIONS);
  const [latestFeaturedMods, setLatestFeaturedMods] = useState<ModHit[]>(mockUpdatedMods);
  const [latestCollectionName, setLatestCollectionName] = useState(FALLBACK_MODRINTH_COLLECTIONS[0].name);
  const [loadingLatestMods, setLoadingLatestMods] = useState(false);
  const [activeSpotlightPlatform, setActiveSpotlightPlatform] = useState<"modrinth" | "curseforge">("modrinth");
  const [activeCollection, setActiveCollection] = useState<CollectionItem | null>(null);
  const [activeCollectionMods, setActiveCollectionMods] = useState<ModHit[]>([]);
  const [loadingActiveMods, setLoadingActiveMods] = useState(false);

  const [theme, setTheme] = useState<"official" | "vampire" | "modern">("official");
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string } | null>(null);
  const [youtubePosts, setYoutubePosts] = useState<any[]>([]);
  const [loadingYoutube, setLoadingYoutube] = useState(false);
  const [currentChannel, setCurrentChannel] = useState("https://www.youtube.com/@EnderVerseMC");
  const [youtubeFeedType, setYoutubeFeedType] = useState<"posts" | "videos" | "shorts">("posts");
  const [followedChannels, setFollowedChannels] = useState<any[]>([
    { name: "Wero Lovernite", url: "https://www.youtube.com/@Wero_lovernite", visible: true },
    { name: "EnderVerseMC", url: "https://www.youtube.com/@EnderVerseMC", visible: true },
  ]);
  const [showChannelManager, setShowChannelManager] = useState(false);
  const [newChannelInput, setNewChannelInput] = useState("");
  const [rankings, setRankings] = useState<ModHit[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(false);
  const [showDraftPicker, setShowDraftPicker] = useState(false);
  const [pendingMod, setPendingMod] = useState<ModHit | null>(null);

  const showAlert = useCallback((title: string, message: string) => setCustomAlert({ title, message }), []);

  const ensureMaxThreeVisible = useCallback((channels: any[]) => {
    if (!Array.isArray(channels)) return [];
    const hasVisible = channels.some(c => c.visible === true);
    if (!hasVisible && channels.length > 0) {
      return channels.map((c, idx) => ({ ...c, visible: idx < 3 }));
    }
    let count = 0;
    return channels.map(c => {
      if (c.visible === true) {
        count++;
        if (count > 3) return { ...c, visible: false };
        return c;
      }
      return { ...c, visible: false };
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("mim-theme") as any;
    if (saved && ["official", "vampire", "modern"].includes(saved)) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }

    const savedChannels = localStorage.getItem("mim_spotlight_showcase_channels");
    if (savedChannels) {
      try {
        const parsed = JSON.parse(savedChannels);
        if (Array.isArray(parsed) && parsed.length) {
          setShowcaseChannels(parsed);
          return;
        }
      } catch {}
    }
    setShowcaseChannels(DEFAULT_CHANNELS);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      setLoadingUserData(true);
      const [{ data: profData }, { data: favs }, { data: drafts }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("favorite_mods").select("*").eq("profile_id", userId),
        supabase.from("drafts").select("*, draft_items (id, project_id, mod_name, source, category, content_type, side, version_id, dependencies)").eq("owner_id", userId),
      ]);

      if (profData) {
        setProfile(profData);
        if (Array.isArray(profData.banner_meta?.youtube_channels)) {
          setFollowedChannels(ensureMaxThreeVisible(profData.banner_meta.youtube_channels));
        }
        if (["official", "vampire", "modern"].includes(profData.banner_meta?.theme)) {
          const cloudTheme = profData.banner_meta.theme;
          setTheme(cloudTheme);
          localStorage.setItem("mim-theme", cloudTheme);
          document.documentElement.setAttribute("data-theme", cloudTheme);
        }
      }

      setUserFavorites(favs || []);

      if (drafts) {
        const allItemIds = drafts.flatMap((draft: any) => (draft.draft_items || []).map((item: any) => item.project_id));
        const iconsMap = await fetchDraftIcons(allItemIds);
        setUserDrafts(drafts.map((draft: any) => ({
          id: draft.id,
          name: draft.name,
          minecraft_version: draft.minecraft_version,
          loader: draft.loader,
          visibility: draft.visibility,
          cover_image: draft.cover_image || null,
          items: (draft.draft_items || []).map((item: any) => ({
            id: item.id,
            project_id: item.project_id,
            name: item.mod_name || item.project_id,
            icon_url: iconsMap[item.project_id],
            project_type: item.content_type || item.category || "mod",
            content_type: item.content_type || item.category || "mod",
            category: item.category || item.content_type || "mod",
            side: item.side || "both",
            version_id: item.version_id,
            dependencies: item.dependencies || [],
            game_versions: [draft.minecraft_version].filter(Boolean),
            loaders: [draft.loader].filter(Boolean),
          })),
        })));
      }
    } catch (err) {
      console.error("Error loading user cloud data:", err);
    } finally {
      setLoadingUserData(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      void loadUserData(session.user.id);
      return;
    }

    setProfile(null);
    setUserFavorites([]);
    setUserDrafts([]);
    const saved = localStorage.getItem("mim_web_youtube_channels");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          setFollowedChannels(ensureMaxThreeVisible(parsed));
        }
      } catch {}
    }
  }, [session, loadUserData]);

  useEffect(() => {
    const refreshDrafts = () => session?.user?.id && void loadUserData(session.user.id);
    window.addEventListener("fomo-draft-items-changed", refreshDrafts);
    return () => window.removeEventListener("fomo-draft-items-changed", refreshDrafts);
  }, [session, loadUserData]);

  useEffect(() => {
    const visible = followedChannels.filter(c => c.visible === true);
    if (visible.length && !visible.some((c) => c.url === currentChannel)) {
      setCurrentChannel(visible[0].url);
    }
  }, [followedChannels, currentChannel]);

  const handleThemeChange = async (newTheme: "official" | "vampire" | "modern") => {
    setTheme(newTheme);
    localStorage.setItem("mim-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase.from("profiles").select("banner_meta").eq("id", session.user.id).single();
      await supabase.from("profiles").update({
        banner_meta: { ...(data?.banner_meta || {}), theme: newTheme },
        updated_at: new Date().toISOString(),
      }).eq("id", session.user.id);
    } catch (err) {
      console.error("Error syncing theme to Supabase:", err);
    }
  };

  const handleSaveShowcaseChannels = (channels: string[]) => {
    setShowcaseChannels(channels);
    localStorage.setItem("mim_spotlight_showcase_channels", JSON.stringify(channels));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setAuthLoading(true);
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { username: username || email.split("@")[0] } } });
        if (error) throw error;
        showAlert("Registro exitoso", "Revisá tu email si Supabase requiere confirmación.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      showAlert("Error de autenticación", err.message || "Error en la autenticación");
    } finally {
      setAuthLoading(false);
    }
  };

  const syncFollowedChannels = async (channels: typeof followedChannels) => {
    if (session?.user?.id) {
      await supabase.from("profiles").update({ banner_meta: { ...profile?.banner_meta, youtube_channels: channels } }).eq("id", session.user.id);
      setProfile((prev: any) => ({ ...prev, banner_meta: { ...prev?.banner_meta, youtube_channels: channels } }));
    } else {
      localStorage.setItem("mim_web_youtube_channels", JSON.stringify(channels));
    }
  };

  const handleAddChannel = async () => {
    const raw = newChannelInput.trim();
    if (!raw) return;
    const handle = raw.startsWith("http") ? raw.split("@")[1]?.split("/")[0] || raw.split("/").pop() || raw : raw.replace(/^@?/, "@");
    const url = (raw.startsWith("http") ? raw : `https://www.youtube.com/${handle}`).replace(/\/$/, "");
    if (followedChannels.some((c) => c.url.toLowerCase() === url.toLowerCase())) {
      showAlert("Canal ya existe", "Este canal ya está en tu lista.");
      return;
    }
    const currentlyVisibleCount = followedChannels.filter(c => c.visible === true).length;
    const newChan = { name: handle, url, visible: currentlyVisibleCount < 3 };
    const updated = [...followedChannels, newChan];
    setFollowedChannels(updated);
    setNewChannelInput("");
    if (newChan.visible) {
      setCurrentChannel(url);
    }
    await syncFollowedChannels(updated);
  };

  const handleRemoveChannel = async (urlToRemove: string) => {
    if (followedChannels.length <= 1) {
      showAlert("Mínimo requerido", "Debes tener al menos un canal en tu lista.");
      return;
    }
    const updated = followedChannels.filter((c) => c.url !== urlToRemove);
    const corrected = ensureMaxThreeVisible(updated);
    setFollowedChannels(corrected);
    if (currentChannel === urlToRemove) {
      const active = corrected.find(c => c.visible === true) || corrected[0];
      if (active) setCurrentChannel(active.url);
    }
    await syncFollowedChannels(corrected);
  };

  const handleToggleChannelVisibility = async (url: string) => {
    const isVisible = followedChannels.some(c => c.url === url && c.visible === true);
    const currentlyVisibleCount = followedChannels.filter(c => c.visible === true).length;

    if (!isVisible && currentlyVisibleCount >= 3) {
      showAlert("Límite alcanzado", "Puedes tener un máximo de 3 canales visibles.");
      return;
    }

    if (isVisible && currentlyVisibleCount <= 1) {
      showAlert("Mínimo requerido", "Debes tener al menos 1 canal visible.");
      return;
    }

    const updated = followedChannels.map(c => {
      if (c.url === url) {
        return { ...c, visible: !isVisible };
      }
      return c;
    });

    setFollowedChannels(updated);

    if (isVisible && currentChannel === url) {
      const nextVisible = updated.find(c => c.visible === true);
      if (nextVisible) setCurrentChannel(nextVisible.url);
    }

    await syncFollowedChannels(updated);
  };

  const loadCollectionMods = useCallback(async (collection: CollectionItem, isSpotlightHero = false) => {
    try {
      isSpotlightHero ? setLoadingLatestMods(true) : setLoadingActiveMods(true);
      if (collection.mods?.length) {
        isSpotlightHero ? setLatestFeaturedMods(collection.mods) : setActiveCollectionMods(collection.mods);
        return;
      }

      const collRes = await fetch("https://api.modrinth.com/v3/user/modrinth/collections");
      const colls = collRes.ok ? await collRes.json() : [];
      const projectIds = colls.find((c: any) => c.id === collection.id)?.projects?.slice(0, 15) || [];
      if (projectIds.length) {
        const pRes = await fetch(`https://api.modrinth.com/v2/projects?ids=${JSON.stringify(projectIds)}`);
        if (pRes.ok) {
          const projects = await pRes.json();
          const mapped = projects.map((m: any) => ({
            projectId: m.id,
            title: m.title,
            description: m.description,
            iconUrl: m.icon_url,
            author: m.author || "Creador",
            projectType: m.project_type,
            categories: m.categories,
            url: `https://modrinth.com/${m.project_type}/${m.slug}`,
            _source: "modrinth",
          }));
          isSpotlightHero ? setLatestFeaturedMods(mapped) : setActiveCollectionMods(mapped);
          return;
        }
      }
      isSpotlightHero ? setLatestFeaturedMods(mockUpdatedMods.slice(0, 5)) : setActiveCollectionMods(mockUpdatedMods.slice(0, 6));
    } catch (err) {
      console.error("Failed to load collection mods:", err);
    } finally {
      isSpotlightHero ? setLoadingLatestMods(false) : setLoadingActiveMods(false);
    }
  }, []);

  const loadCollections = useCallback(async () => {
    try {
      const [mrRes, cfRes] = await Promise.all([
        fetch("/api/modrinth/official").then((r) => r.ok ? r.json() : { collections: [] }),
        fetch("/api/curseforge/picks").then((r) => r.ok ? r.json() : { picks: [] }),
      ]);
      const mrColls = mrRes.collections?.length ? mrRes.collections : FALLBACK_MODRINTH_COLLECTIONS;
      const cfPicks = cfRes.picks?.length ? cfRes.picks : FALLBACK_CURSEFORGE_COLLECTIONS;
      setModrinthFeatured(mrColls);
      setCurseForgeFeatured(cfPicks);
      if (mrColls[0]) {
        setLatestCollectionName(mrColls[0].name);
        void loadCollectionMods(mrColls[0], true);
      }
    } catch (err) {
      console.error("Error loading collections:", err);
      setModrinthFeatured(FALLBACK_MODRINTH_COLLECTIONS);
      setCurseForgeFeatured(FALLBACK_CURSEFORGE_COLLECTIONS);
      setLatestCollectionName(FALLBACK_MODRINTH_COLLECTIONS[0].name);
      setLatestFeaturedMods(mockUpdatedMods);
    }
  }, [loadCollectionMods]);

  const handleEnterCollection = (collection: CollectionItem) => {
    setActiveCollection(collection);
    setActiveCollectionMods([]);
    void loadCollectionMods(collection, false);
    // Navigate to collections tab so the detail view is immediately visible
    setActiveTab("collections");
  };

  const handleEnterDraftCollection = async (draft: any) => {
    setActiveCollection({
      id: draft.id,
      name: draft.name,
      description: draft.description || `Draft Modpack (${draft.minecraft_version} · ${draft.loader})`,
      projectCount: draft.items?.length || 0,
      source: "draft" as any,
    });
    setActiveCollectionMods([]);
    setLoadingActiveMods(true);
    try {
      let items = draft.items;
      if (!items) {
        const { data } = await supabase.from("draft_items").select("*").eq("draft_id", draft.id);
        const icons = await fetchDraftIcons((data || []).map((i: any) => i.project_id));
        items = (data || []).map((item: any) => ({
          id: item.id,
          project_id: item.project_id,
          name: item.mod_name,
          icon_url: icons[item.project_id],
          category: item.category || item.content_type || "mod",
          content_type: item.content_type || item.category || "mod",
          side: item.side || "both",
          version_id: item.version_id,
          dependencies: item.dependencies || [],
          game_versions: [draft.minecraft_version].filter(Boolean),
          loaders: [draft.loader].filter(Boolean),
        }));
      } else {
        const missingIconIds = items.filter((item: any) => item.project_id && !item.icon_url).map((item: any) => item.project_id);
        if (missingIconIds.length) {
          const icons = await fetchDraftIcons(missingIconIds);
          items = items.map((item: any) => ({
            ...item,
            icon_url: item.icon_url || icons[item.project_id],
            game_versions: item.game_versions || [draft.minecraft_version].filter(Boolean),
            loaders: item.loaders || [draft.loader].filter(Boolean),
          }));
        }
      }
      setActiveCollectionMods((items || []).map((item: any) => ({
        itemId: item.id,
        projectId: item.project_id,
        title: item.name || item.project_id,
        description: "",
        iconUrl: item.icon_url,
        author: "Comunidad",
        projectType: item.content_type || item.category || "mod",
        categories: [item.category || item.content_type].filter(Boolean),
        url: `https://modrinth.com/${item.content_type || item.category || "mod"}/${item.project_id}`,
        _source: "modrinth",
        gameVersions: item.game_versions || [draft.minecraft_version].filter(Boolean),
        loaders: item.loaders || [draft.loader].filter(Boolean),
        side: item.side || "both",
        versionId: item.version_id || null,
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActiveMods(false);
    }
    setActiveTab("collections");
  };

  const loadSpotlightData = useCallback(async () => {
    try {
      const facets = encodeURIComponent('[["versions:1.20.1"],["categories:fabric"]]');
      const [updatedRes, newestRes] = await Promise.all([
        fetch(`https://api.modrinth.com/v2/search?index=updated&limit=12&facets=${facets}`).then((r) => r.json()),
        fetch(`https://api.modrinth.com/v2/search?index=newest&limit=12&facets=${facets}`).then((r) => r.json()),
      ]);
      const mapHits = (hits: any[], backup: ModHit[]) => hits?.length ? hits.map((m: any) => ({
        projectId: m.project_id,
        title: m.title,
        description: m.description,
        iconUrl: m.icon_url,
        author: m.author,
        projectType: m.project_type,
        categories: m.categories,
        url: `https://modrinth.com/${m.project_type}/${m.slug}`,
        _source: "modrinth",
      })) : backup;
      setUpdatedMods(mapHits(updatedRes.hits, mockUpdatedMods));
      setNewestMods(mapHits(newestRes.hits, mockNewestMods));
    } catch (err) {
      console.error("Error loading live Modrinth data:", err);
    }
  }, []);

  const loadRankingsData = useCallback(async () => {
    try {
      setLoadingRankings(true);
      const res = await fetch("/api/fomo/community-rankings");
      if (res.ok) setRankings((await res.json()).rankings || []);
    } catch (err) {
      console.error("Error fetching community rankings:", err);
    } finally {
      setLoadingRankings(false);
    }
  }, []);

  const loadYoutubeData = useCallback(async (channel: string, type = "posts") => {
    try {
      setLoadingYoutube(true);
      const res = await fetch(`/api/fomo/youtube-posts?channel=${encodeURIComponent(channel)}&type=${type}`);
      if (res.ok) setYoutubePosts((await res.json()).showcases || []);
    } catch (err) {
      console.error("Error loading YouTube posts:", err);
    } finally {
      setLoadingYoutube(false);
    }
  }, []);

  const runDiscoverSearch = useCallback(async (pageNumber = 1) => {
    try {
      setDiscoverLoading(true);
      setDiscoverError("");
      const offset = (pageNumber - 1) * 15;
      
      let mapped: ModHit[] = [];
      let totalHits = 0;
      
      if (discoverSource === "curseforge") {
        const url = `/api/curseforge/discover?projectType=${discoverType}&loader=${discoverLoader}&gameVersion=${discoverVersion}&q=${encodeURIComponent(discoverQuery)}&page=${pageNumber}&pageSize=15`;
        const res = await fetch(url);
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "Error en la API de CurseForge");
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        mapped = data.mods || [];
        totalHits = data.total || 0;
      } else {
        const facetsArray = [[`project_type:${discoverType}`]];
        if (discoverType !== "datapack" && discoverVersion) facetsArray.push([`versions:${discoverVersion}`]);
        if (discoverType === "mod" && discoverLoader !== "any") facetsArray.push([`categories:${discoverLoader}`]);
        const url = `https://api.modrinth.com/v2/search?facets=${encodeURIComponent(JSON.stringify(facetsArray))}&index=downloads${discoverQuery ? `&query=${encodeURIComponent(discoverQuery)}` : ""}&limit=15&offset=${offset}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`La API de Modrinth no respondió correctamente (HTTP ${res.status})`);
        }
        const data = await res.json();
        mapped = (data.hits || []).map((h: any) => ({
          projectId: h.project_id,
          title: h.title,
          description: h.description,
          iconUrl: h.icon_url,
          author: h.author,
          projectType: h.project_type || "mod",
          categories: h.categories || [],
          url: `https://modrinth.com/${h.project_type || "mod"}/${h.slug}`,
          downloads: h.downloads,
          _source: "modrinth",
        }));
        totalHits = data.total_hits || 0;
        
        if (mapped.length === 0 && totalHits > 0) {
          throw new Error("El índice de búsqueda de Modrinth está caído o en mantenimiento.");
        }
      }
      
      setDiscoverResults((prev) => pageNumber === 1 ? mapped : [...prev, ...mapped]);
      setDiscoverTotal(totalHits);
      setDiscoverPage(pageNumber);
    } catch (err: any) {
      console.error("Discover search error:", err);
      setDiscoverError(err.message || "Error al buscar mods");
      if (pageNumber === 1) {
        setDiscoverResults([]);
      }
    } finally {
      setDiscoverLoading(false);
    }
  }, [discoverQuery, discoverType, discoverVersion, discoverLoader, discoverSource]);

  useEffect(() => {
    if (activeTab === "spotlight") {
      void loadSpotlightData();
      void loadCollections();
    } else if (activeTab === "collections") {
      void loadCollections();
    } else if (activeTab === "rankings") {
      void loadRankingsData();
    } else if (activeTab === "feed") {
      void loadYoutubeData(currentChannel, youtubeFeedType);
    } else if (activeTab === "discover") {
      void runDiscoverSearch(1);
    }
  }, [activeTab, currentChannel, youtubeFeedType, loadSpotlightData, loadCollections, loadRankingsData, loadYoutubeData, runDiscoverSearch]);

  const handleOpenModDetails = async (mod: ModHit, isDependency = false) => {
    const normalizedMod = mod.projectId ? mod : normalizeFavorite(mod);
    setSelectedMod(normalizedMod);
    setSelectedModDetails(null);
    setSelectedModDeps([]);
    setLoadingDetails(true);
    setModalTab("summary");

    let details = null;
    let depsData: any[] = [];
    try {
      if (normalizedMod._source === "curseforge") {
        const res = await fetch(`/api/curseforge/project?projectId=${normalizedMod.projectId}`);
        if (res.ok) {
          const data = await res.json();
          details = data.details;
          depsData = data.dependencies || [];
          setSelectedModDetails(details);
          setSelectedModDeps(depsData);
        }
      } else {
        const [pRes, dRes] = await Promise.all([
          fetch(`https://api.modrinth.com/v2/project/${normalizedMod.projectId}`),
          fetch(`https://api.modrinth.com/v2/project/${normalizedMod.projectId}/dependencies`),
        ]);
        if (pRes.ok) {
          details = await pRes.json();
          setSelectedModDetails(details);
        }
        if (dRes.ok) {
          depsData = (await dRes.json()).projects || [];
          setSelectedModDeps(depsData);
        }
      }
    } catch (err) {
      console.error("Failed to load mod detailed metadata:", err);
    } finally {
      const stackItem = { mod: normalizedMod, details, deps: depsData, tab: "summary" as const };
      if (isDependency) {
        const nextStack = [...modStack.slice(0, activeStackIndex + 1), stackItem];
        setModStack(nextStack);
        setActiveStackIndex(nextStack.length - 1);
      } else {
        setModStack([stackItem]);
        setActiveStackIndex(0);
      }
      setLoadingDetails(false);
    }
  };

  const handleSwitchStackIndex = (index: number) => {
    if (index < 0 || index >= modStack.length) return;
    const item = modStack[index];
    setActiveStackIndex(index);
    setSelectedMod(item.mod);
    setSelectedModDetails(item.details);
    setSelectedModDeps(item.deps);
    setModalTab(item.tab);
  };

  const createDraft = async (name: string, version: string, loader: string) => {
    if (!session?.user?.id) return null;
    try {
      const { data, error } = await supabase.from("drafts").insert({
        owner_id: session.user.id,
        name,
        minecraft_version: version,
        loader,
        visibility: "private",
      }).select().single();
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("fomo-draft-items-changed"));
      await loadUserData(session.user.id);
      return data;
    } catch (err: any) {
      showAlert("Error", `Error al crear el draft: ${err.message}`);
      return null;
    }
  };

  const addModToDraft = async (draftId: string, mod: ModHit, category: string): Promise<DraftAddResult> => {
    if (!session?.user?.id) return { ok: false, status: "error", message: "Necesitás iniciar sesión para editar Drafts." };
    const draft = userDrafts.find((d) => d.id === draftId);
    const draftVersion = draft?.minecraft_version || "1.20.1";
    const draftLoader = draft?.loader || "fabric";
    let details: any = null;
    let versions: any[] = [];
    let versionId: string | null = null;
    let dependencies: any[] = [];
    const contentType = normalizeContentType({ ...mod, projectType: category || mod.projectType });
    try {
      const { data: existing, error: checkErr } = await supabase.from("draft_items").select("id").eq("draft_id", draftId).eq("project_id", mod.projectId).eq("content_type", contentType).maybeSingle();
      if (checkErr) throw checkErr;
      if (existing) {
        showAlert("Ya existe", "Ese contenido ya está en este Draft.");
        return { ok: false, status: "exists", message: `${mod.title} ya estaba en este Draft.`, contentType };
      }

      if ((mod._source || "modrinth") !== "curseforge") {
        const projectRes = await fetch(`https://api.modrinth.com/v2/project/${mod.projectId}`);
        if (projectRes.ok) details = await projectRes.json();

        const loader = normalizeLoader(draftLoader);
        const query = [`game_versions=${encodeURIComponent(JSON.stringify([draftVersion]))}`];
        if (contentType === "mod" && loader) query.push(`loaders=${encodeURIComponent(JSON.stringify([loader]))}`);
        const versionRes = await fetch(`https://api.modrinth.com/v2/project/${mod.projectId}/version?${query.join("&")}`);
        if (versionRes.ok) {
          versions = await versionRes.json();
          const match = versions[0];
          versionId = match?.id || null;
          dependencies = match?.dependencies || [];
        }
      }

      const compatible = (mod._source || "modrinth") === "curseforge" || Boolean(versionId);
      const side = inferSide(contentType, details);
      const { error } = await supabase.from("draft_items").insert({
        draft_id: draftId,
        source: mod._source || "modrinth",
        project_id: mod.projectId,
        version_id: versionId,
        mod_name: mod.title || mod.projectId,
        added_by: session.user.id,
        content_type: contentType,
        category: contentType,
        side,
        dependencies,
      });
      if (error) throw error;

      const requiredDeps = dependencies.filter((dep: any) => dep.dependency_type === "required" && dep.project_id);
      const knownIds = new Set([mod.projectId, ...(draft?.items || []).map((item: any) => item.project_id)]);
      const missingIds = requiredDeps.map((dep: any) => dep.project_id).filter((id: string) => !knownIds.has(id));
      if (missingIds.length) {
        const projectsRes = await fetch(`https://api.modrinth.com/v2/projects?ids=${encodeURIComponent(JSON.stringify(missingIds))}`);
        if (projectsRes.ok) {
          const projects = await projectsRes.json();
          await supabase.from("draft_items").insert(projects.map((project: any) => ({
            draft_id: draftId,
            source: "modrinth",
            project_id: project.id,
            version_id: null,
            mod_name: project.title || project.id,
            added_by: session.user.id,
            content_type: normalizeContentType(project),
            category: normalizeContentType(project),
            side: inferSide(normalizeContentType(project), project),
            dependencies: [],
          })));
        }
      }

      window.dispatchEvent(new CustomEvent("fomo-draft-items-changed"));
      await loadUserData(session.user.id);
      const label = contentType === "resourcepack" ? "textura/resourcepack" : contentType;
      const depText = missingIds.length ? ` Se agregaron ${missingIds.length} dependencia(s) requeridas.` : "";
      return {
        ok: true,
        status: compatible ? "compatible" : "warning",
        contentType,
        message: compatible
          ? `${mod.title} agregado como ${label}. Compatible con ${draftLoader} ${draftVersion}.${depText}`
          : `${mod.title} agregado como ${label}, pero no encontré versión para ${draftLoader} ${draftVersion}. Revisalo antes de descargar.${depText}`,
      };
    } catch (err: any) {
      showAlert("Error", `Error al añadir al draft: ${err.message}`);
      return { ok: false, status: "error", message: `No se pudo agregar: ${err.message}`, contentType };
    }
  };

  const removeModFromDraft = async (draftId: string, projectId: string, itemId?: string) => {
    if (!session?.user?.id) return;
    const query = supabase.from("draft_items").delete();
    const { error } = itemId
      ? await query.eq("id", itemId)
      : await query.eq("draft_id", draftId).eq("project_id", projectId);
    if (error) showAlert("Error", `Error al eliminar del draft: ${error.message}`);
    window.dispatchEvent(new CustomEvent("fomo-draft-items-changed"));
    await loadUserData(session.user.id);
  };

  const recategorizeDraftItem = async (draftId: string, projectId: string, category: string) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from("draft_items").update({ category, content_type: category }).eq("draft_id", draftId).eq("project_id", projectId);
    if (error) showAlert("Error", `Error al recategorizar: ${error.message}`);
    window.dispatchEvent(new CustomEvent("fomo-draft-items-changed"));
    await loadUserData(session.user.id);
  };

  const updateDraftItemSide = async (draftId: string, projectId: string, side: string, itemId?: string) => {
    if (!session?.user?.id) return;
    const query = supabase.from("draft_items").update({ side });
    const { error } = itemId
      ? await query.eq("id", itemId)
      : await query.eq("draft_id", draftId).eq("project_id", projectId);
    if (error) showAlert("Error", `Error al actualizar lado: ${error.message}`);
    window.dispatchEvent(new CustomEvent("fomo-draft-items-changed"));
    await loadUserData(session.user.id);
  };

  const updateDraftCover = async (draftId: string, coverImage: string | null) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from("drafts").update({ cover_image: coverImage, updated_at: new Date().toISOString() }).eq("id", draftId);
    if (error) showAlert("Error", `Error al actualizar banner: ${error.message}`);
    await loadUserData(session.user.id);
  };

  const deleteDraft = async (draftId: string) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from("drafts").delete().eq("id", draftId);
    if (error) showAlert("Error", `Error al eliminar el draft: ${error.message}`);
    window.dispatchEvent(new CustomEvent("fomo-draft-items-changed"));
    await loadUserData(session.user.id);
  };

  const onToggleFavorite = async (mod: ModHit) => {
    if (!session?.user?.id) return;
    try {
      const isFav = userFavorites.some((f) => (f.mod_id || f.project_id || f.id) === mod.projectId);
      const request = isFav
        ? supabase.from("favorite_mods").delete().eq("profile_id", session.user.id).eq("mod_id", mod.projectId)
        : supabase.from("favorite_mods").insert({
          profile_id: session.user.id,
          mod_id: mod.projectId,
          name: mod.title,
          icon_url: mod.iconUrl,
          platform: mod._source || "modrinth",
          summary: JSON.stringify({
            description: mod.description,
            project_type: mod.projectType || "mod",
            categories: mod.categories || [],
            url: mod.url,
          }),
        });
      const { error } = await request;
      if (error) throw error;
      await loadUserData(session.user.id);
    } catch (err: any) {
      showAlert("Error", `Error al guardar favorito: ${err.message}`);
    }
  };

  return {
    activeTab, setActiveTab, selectedMod, selectedModDetails, selectedModDeps, loadingDetails, modalTab, setModalTab,
    modStack, activeStackIndex, discoverQuery, setDiscoverQuery, discoverType, setDiscoverType, discoverVersion,
    setDiscoverVersion, discoverLoader, setDiscoverLoader, discoverResults, setDiscoverResults, discoverLoading,
    discoverPage, setDiscoverPage, discoverTotal, discoverSource, setDiscoverSource, discoverError, session, email, setEmail, password, setPassword, username,
    setUsername, isRegistering, setIsRegistering, authLoading, profile, setProfile, showEditProfile, setShowEditProfile,
    showcaseChannels, showChannelPicker, setShowChannelPicker, userFavorites, userDrafts, loadingUserData,
    updatedMods, newestMods, modrinthFeatured, curseForgeFeatured, latestFeaturedMods, latestCollectionName,
    loadingLatestMods, activeSpotlightPlatform, setActiveSpotlightPlatform, activeCollection, activeCollectionMods,
    loadingActiveMods, theme, customAlert, setCustomAlert, youtubePosts, loadingYoutube, currentChannel,
    setCurrentChannel, youtubeFeedType, setYoutubeFeedType, followedChannels, showChannelManager, setShowChannelManager, newChannelInput, setNewChannelInput,
    rankings, loadingRankings, showDraftPicker, setShowDraftPicker, pendingMod, setPendingMod, handleThemeChange,
    handleSaveShowcaseChannels, handleAuth, handleLogout: () => supabase.auth.signOut(), handleAddChannel,
    handleRemoveChannel, handleEnterCollection, handleExitCollection: () => { setActiveCollection(null); setActiveCollectionMods([]); },
    handleEnterDraftCollection, runDiscoverSearch, handleOpenModDetails, handleSwitchStackIndex,
    handleGoBackInStack: () => activeStackIndex > 0 && handleSwitchStackIndex(activeStackIndex - 1),
    handleCloseModDetails: () => { setSelectedMod(null); setSelectedModDetails(null); setSelectedModDeps([]); setModStack([]); setActiveStackIndex(-1); },
    createDraft, addModToDraft, removeModFromDraft, recategorizeDraftItem, updateDraftItemSide, updateDraftCover, deleteDraft, onToggleFavorite,
    handleToggleChannelVisibility,
    refreshUserData: () => session?.user?.id && void loadUserData(session.user.id),
  };
}
