"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { ModHit } from "../components/SpotlightMarquees";
import type { DraftAddResult } from "../components/DraftPickerModal";
import { mockNewestMods, mockUpdatedMods } from "../lib/mockData";
import { supabase } from "../lib/supabaseClient";
import type { CollectionItem } from "../app/types";
import { attachDependencyTypes, buildDependencyTypeMap } from "../lib/dependencies";
import { inferSide, normalizeContentType, normalizeLoader } from "../lib/projectTypes";
import { fetchUserShares, isFavoritePlatformConstraintError, sortSharesByPriority } from "../lib/shareMeta";

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
const COLLECTIONS_CACHE_KEY = "mim_collections_payload_v1";
const COLLECTIONS_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

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
  
  let title = fav.name || fav.mod_name || projectId;
  let author = fav.author || "Comunidad";
  if (fav.name && fav.name.includes(" ::: ")) {
    const parts = fav.name.split(" ::: ");
    title = parts[0];
    author = parts[1];
  }

  return {
    projectId,
    title,
    description: fav.description || meta.description || fav.summary || "",
    iconUrl: fav.icon_url,
    author,
    projectType,
    categories: fav.categories || meta.categories || [],
    url: fav.url || meta.url || `https://modrinth.com/${projectType}/${projectId}`,
    _source: fav.platform || fav.source || "modrinth",
  };
}

function parseStringArrayCache(value: string | null): string[] | null {
  if (!value || !value.trim().startsWith("[")) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : null;
  } catch {
    return null;
  }
}

export function useHomeController() {
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedMod, setSelectedMod] = useState<ModHit | null>(null);
  const [selectedModDetails, setSelectedModDetails] = useState<any>(null);
  const [selectedModDeps, setSelectedModDeps] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [modalTab, setModalTab] = useState<"summary" | "gallery" | "desc" | "versions" | "deps">("summary");
  const [modStack, setModStack] = useState<any[]>([]);
  const [activeStackIndex, setActiveStackIndex] = useState(-1);

  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverType, setDiscoverType] = useState("mod");
  const [discoverVersion, setDiscoverVersion] = useState<string[]>([]);
  const [discoverLoader, setDiscoverLoader] = useState<string[]>([]);
  const [discoverEnvironment, setDiscoverEnvironment] = useState("any");
  const [discoverCategory, setDiscoverCategory] = useState<string[]>([]);
  const [discoverSort, setDiscoverSort] = useState<string>("newest");
  const [discoverResults, setDiscoverResults] = useState<ModHit[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverTotal, setDiscoverTotal] = useState(0);
  const [discoverSource, setDiscoverSource] = useState<"modrinth" | "curseforge" | "all">("modrinth");
  const [discoverError, setDiscoverError] = useState("");

  const [isLoaded, setIsLoaded] = useState(false);
  const initialSearchSkippedRef = useRef(false);
  const collectionsLastLoadedRef = useRef(0);
  const collectionsRequestRef = useRef<Promise<void> | null>(null);

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
  const [userShares, setUserShares] = useState<any[]>([]);
  const [userDrafts, setUserDrafts] = useState<any[]>([]);
  const [userFollowedAuthors, setUserFollowedAuthors] = useState<any[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);

  const [updatedMods, setUpdatedMods] = useState<ModHit[]>(mockUpdatedMods);
  const [newestMods, setNewestMods] = useState<ModHit[]>(mockNewestMods);
  const [modrinthFeatured, setModrinthFeatured] = useState<CollectionItem[]>(FALLBACK_MODRINTH_COLLECTIONS);
  const [curseForgeFeatured, setCurseForgeFeatured] = useState<CollectionItem[]>(FALLBACK_CURSEFORGE_COLLECTIONS);
  const [curseForgeCollections, setCurseForgeCollections] = useState<CollectionItem[]>(FALLBACK_CURSEFORGE_COLLECTIONS);
  const [latestFeaturedMods, setLatestFeaturedMods] = useState<ModHit[]>(mockUpdatedMods);
  const [latestCollectionName, setLatestCollectionName] = useState(FALLBACK_MODRINTH_COLLECTIONS[0].name);
  const [loadingLatestMods, setLoadingLatestMods] = useState(false);
  const [activeSpotlightPlatform, setActiveSpotlightPlatform] = useState<"modrinth" | "curseforge">("modrinth");
  const [activeCollection, setActiveCollection] = useState<CollectionItem | null>(null);
  const [activeCollectionMods, setActiveCollectionMods] = useState<ModHit[]>([]);
  const [loadingActiveMods, setLoadingActiveMods] = useState(false);
  const [activeDraft, setActiveDraft] = useState<any | null>(null);

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
        }
      } catch {}
    } else {
      setShowcaseChannels(DEFAULT_CHANNELS);
    }

    // ── Cache Loading ──
    const cachedTab = localStorage.getItem("mim_active_tab");
    if (cachedTab) setActiveTab(cachedTab);

    const cachedQuery = localStorage.getItem("mim_discover_query");
    if (cachedQuery !== null) setDiscoverQuery(cachedQuery);

    const cachedType = localStorage.getItem("mim_discover_type");
    if (cachedType !== null) setDiscoverType(cachedType);

    const cachedVersion = localStorage.getItem("mim_discover_version");
    if (cachedVersion !== null) setDiscoverVersion(parseStringArrayCache(cachedVersion) ?? []);

    const cachedLoader = localStorage.getItem("mim_discover_loader");
    if (cachedLoader !== null) setDiscoverLoader(parseStringArrayCache(cachedLoader) ?? []);

    const cachedEnvironment = localStorage.getItem("mim_discover_environment");
    if (cachedEnvironment !== null) setDiscoverEnvironment(cachedEnvironment);

    const cachedCategory = localStorage.getItem("mim_discover_category");
    if (cachedCategory !== null) {
      try { setDiscoverCategory(JSON.parse(cachedCategory)); } catch {}
    }

    const cachedSort = localStorage.getItem("mim_discover_sort");
    const sortDefaultMigrated = localStorage.getItem("mim_discover_sort_default_v2") === "1";
    if (cachedSort !== null && (sortDefaultMigrated || cachedSort !== "relevance")) {
      setDiscoverSort(cachedSort);
    }
    localStorage.setItem("mim_discover_sort_default_v2", "1");

    const cachedSource = localStorage.getItem("mim_discover_source");
    if (cachedSource !== null) setDiscoverSource(cachedSource as any);

    const cachedPage = localStorage.getItem("mim_discover_page");
    if (cachedPage !== null) setDiscoverPage(Number(cachedPage));

    const cachedTotal = localStorage.getItem("mim_discover_total");
    if (cachedTotal !== null) setDiscoverTotal(Number(cachedTotal));

    const cachedResults = localStorage.getItem("mim_discover_results");
    let hasResults = false;
    if (cachedResults !== null) {
      try {
        const parsed = JSON.parse(cachedResults);
        setDiscoverResults(parsed);
        if (parsed && parsed.length > 0) {
          hasResults = true;
        }
      } catch {}
    }

    const cachedCollection = localStorage.getItem("mim_active_collection");
    if (cachedCollection !== null) {
      try { setActiveCollection(JSON.parse(cachedCollection)); } catch {}
    }

    const cachedCollectionMods = localStorage.getItem("mim_active_collection_mods");
    if (cachedCollectionMods !== null) {
      try { setActiveCollectionMods(JSON.parse(cachedCollectionMods)); } catch {}
    }

    const cachedCollectionsPayload = localStorage.getItem(COLLECTIONS_CACHE_KEY);
    if (cachedCollectionsPayload !== null) {
      try {
        const parsed = JSON.parse(cachedCollectionsPayload);
        if (parsed?.timestamp && Date.now() - parsed.timestamp < COLLECTIONS_CACHE_TTL_MS) {
          if (Array.isArray(parsed.modrinthFeatured)) setModrinthFeatured(parsed.modrinthFeatured);
          if (Array.isArray(parsed.curseForgeFeatured)) setCurseForgeFeatured(parsed.curseForgeFeatured);
          if (Array.isArray(parsed.curseForgeCollections)) setCurseForgeCollections(parsed.curseForgeCollections);
          if (typeof parsed.latestCollectionName === "string") setLatestCollectionName(parsed.latestCollectionName);
          if (Array.isArray(parsed.latestFeaturedMods)) setLatestFeaturedMods(parsed.latestFeaturedMods);
          collectionsLastLoadedRef.current = parsed.timestamp;
        }
      } catch {}
    }

    const cachedDraft = localStorage.getItem("mim_active_draft");
    if (cachedDraft !== null) {
      try { setActiveDraft(JSON.parse(cachedDraft)); } catch {}
    }

    if (hasResults) {
      initialSearchSkippedRef.current = false;
    } else {
      initialSearchSkippedRef.current = true;
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  // ── Cache Saving ──
  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem("mim_active_tab", activeTab);
    localStorage.setItem("mim_discover_query", discoverQuery);
    localStorage.setItem("mim_discover_type", discoverType);
    localStorage.setItem("mim_discover_version", JSON.stringify(discoverVersion));
    localStorage.setItem("mim_discover_loader", JSON.stringify(discoverLoader));
    localStorage.setItem("mim_discover_environment", discoverEnvironment);
    localStorage.setItem("mim_discover_category", JSON.stringify(discoverCategory));
    localStorage.setItem("mim_discover_sort", discoverSort);
    localStorage.setItem("mim_discover_source", discoverSource);
    localStorage.setItem("mim_discover_page", String(discoverPage));
    localStorage.setItem("mim_discover_results", JSON.stringify(discoverResults));
    localStorage.setItem("mim_discover_total", String(discoverTotal));

    if (activeCollection) {
      localStorage.setItem("mim_active_collection", JSON.stringify(activeCollection));
    } else {
      localStorage.removeItem("mim_active_collection");
    }

    localStorage.setItem("mim_active_collection_mods", JSON.stringify(activeCollectionMods));

    if (activeDraft) {
      localStorage.setItem("mim_active_draft", JSON.stringify(activeDraft));
    } else {
      localStorage.removeItem("mim_active_draft");
    }
  }, [
    isLoaded,
    activeTab,
    discoverQuery,
    discoverType,
    discoverVersion,
    discoverLoader,
    discoverEnvironment,
    discoverCategory,
    discoverSort,
    discoverSource,
    discoverPage,
    discoverResults,
    discoverTotal,
    activeCollection,
    activeCollectionMods,
    activeDraft
  ]);

  const loadUserData = useCallback(async (userId: string, silent = false) => {
    try {
      if (!silent) setLoadingUserData(true);
      const [{ data: profData }, { data: follows }, shares, { data: drafts }, { data: followedAuthors }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("followed_mods").select("*").eq("profile_id", userId).order("created_at", { ascending: false }),
        fetchUserShares(userId),
        supabase.from("drafts").select("*, draft_items (id, project_id, mod_name, source, category, content_type, side, version_id, dependencies)").eq("owner_id", userId),
        supabase.from("followed_authors").select("*").eq("profile_id", userId).order("created_at", { ascending: false }),
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

      setUserFavorites(follows || []);
      setUserShares(shares || []);
      setUserFollowedAuthors(followedAuthors || []);

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
      if (!silent) setLoadingUserData(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      void loadUserData(session.user.id);
      return;
    }

    setProfile(null);
    setUserFavorites([]);
    setUserShares([]);
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

      if (collection.source === "curseforge") {
        isSpotlightHero ? setLatestFeaturedMods([]) : setActiveCollectionMods([]);
        return;
      }

      const res = await fetch(`/api/modrinth/official?id=${collection.id}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.mods || [];
        if (isSpotlightHero) {
          setLatestFeaturedMods(mapped);
          try {
            const cachedRaw = localStorage.getItem(COLLECTIONS_CACHE_KEY);
            if (cachedRaw) {
              const parsed = JSON.parse(cachedRaw);
              parsed.latestFeaturedMods = mapped;
              localStorage.setItem(COLLECTIONS_CACHE_KEY, JSON.stringify(parsed));
            }
          } catch {}
        } else {
          setActiveCollectionMods(mapped);
        }
        return;
      }
      const fallback = mockUpdatedMods.slice(0, 5);
      if (isSpotlightHero) {
        setLatestFeaturedMods(fallback);
        try {
          const cachedRaw = localStorage.getItem(COLLECTIONS_CACHE_KEY);
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw);
            parsed.latestFeaturedMods = fallback;
            localStorage.setItem(COLLECTIONS_CACHE_KEY, JSON.stringify(parsed));
          }
        } catch {}
      } else {
        setActiveCollectionMods(mockUpdatedMods.slice(0, 6));
      }
    } catch (err) {
      console.error("Failed to load collection mods:", err);
    } finally {
      isSpotlightHero ? setLoadingLatestMods(false) : setLoadingActiveMods(false);
    }
  }, []);

  const loadCollections = useCallback(async () => {
    const applyCachedCollections = (payload: any) => {
      if (Array.isArray(payload?.modrinthFeatured)) setModrinthFeatured(payload.modrinthFeatured);
      if (Array.isArray(payload?.curseForgeFeatured)) setCurseForgeFeatured(payload.curseForgeFeatured);
      if (Array.isArray(payload?.curseForgeCollections)) setCurseForgeCollections(payload.curseForgeCollections);
      if (typeof payload?.latestCollectionName === "string") setLatestCollectionName(payload.latestCollectionName);
      if (Array.isArray(payload?.latestFeaturedMods)) setLatestFeaturedMods(payload.latestFeaturedMods);
      if (typeof payload?.timestamp === "number") collectionsLastLoadedRef.current = payload.timestamp;
    };

    const cachedRaw = localStorage.getItem(COLLECTIONS_CACHE_KEY);
    let cachedPayload: any = null;
    if (cachedRaw) {
      try {
        cachedPayload = JSON.parse(cachedRaw);
        if (cachedPayload?.timestamp && Array.isArray(cachedPayload.latestFeaturedMods) && cachedPayload.latestFeaturedMods.length > 0) {
          applyCachedCollections(cachedPayload);
        }
      } catch {}
    }

    // In-memory throttling (1 minute) to avoid spamming calls during the same user session
    const THROTTLE_MS = 60 * 1000;
    if (Date.now() - collectionsLastLoadedRef.current < THROTTLE_MS) return;
    if (collectionsRequestRef.current) return collectionsRequestRef.current;

    collectionsRequestRef.current = (async () => {
      try {
      const [mrRes, cfRes] = await Promise.all([
        fetch("/api/modrinth/official").then((r) => r.ok ? r.json() : { collections: [] }),
        fetch("/api/curseforge/picks").then((r) => r.ok ? r.json() : { picks: [] }),
      ]);
      const mrColls = mrRes.collections?.length ? mrRes.collections : FALLBACK_MODRINTH_COLLECTIONS;
      const cfPicks = cfRes.picks?.length ? cfRes.picks : FALLBACK_CURSEFORGE_COLLECTIONS;
      const cfCollections = cfRes.collections?.length ? cfRes.collections : cfPicks;
      setModrinthFeatured(mrColls);
      setCurseForgeFeatured(cfPicks);
      setCurseForgeCollections(cfCollections);
      let latestFeatured: any[] = [];
      if (mrColls[0]) {
        setLatestCollectionName(mrColls[0].name);
        if (Array.isArray(mrRes.latestFeaturedMods) && mrRes.latestFeaturedMods.length > 0) {
          setLatestFeaturedMods(mrRes.latestFeaturedMods);
          latestFeatured = mrRes.latestFeaturedMods;
        } else {
          void loadCollectionMods(mrColls[0], true);
        }
      }

        const payload = {
          timestamp: Date.now(),
          modrinthFeatured: mrColls,
          curseForgeFeatured: cfPicks,
          curseForgeCollections: cfCollections,
          latestCollectionName: mrColls[0]?.name || FALLBACK_MODRINTH_COLLECTIONS[0].name,
          latestFeaturedMods: latestFeatured,
        };
        localStorage.setItem(COLLECTIONS_CACHE_KEY, JSON.stringify(payload));
        collectionsLastLoadedRef.current = payload.timestamp;
      } catch (err) {
      console.error("Error loading collections:", err);
      if (cachedPayload) {
        applyCachedCollections(cachedPayload);
        return;
      }
      setModrinthFeatured(FALLBACK_MODRINTH_COLLECTIONS);
      setCurseForgeFeatured(FALLBACK_CURSEFORGE_COLLECTIONS);
      setCurseForgeCollections(FALLBACK_CURSEFORGE_COLLECTIONS);
      setLatestCollectionName(FALLBACK_MODRINTH_COLLECTIONS[0].name);
      setLatestFeaturedMods(mockUpdatedMods);
      } finally {
        collectionsRequestRef.current = null;
      }
    })();

    return collectionsRequestRef.current;
  }, [loadCollectionMods]);

  const handleEnterCollection = (collection: CollectionItem) => {
    setActiveCollection(collection);
    setActiveCollectionMods([]);
    void loadCollectionMods(collection, false);
    // Navigate to collections tab so the detail view is immediately visible
    setActiveTab("collections");
  };

  const handleEnterDraftCollection = async (draft: any) => {
    setActiveDraft(draft);
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
          game_versions: null,
          loaders: null,
        }));
      } else {
        const missingIconIds = items
          .filter((item: any) => item.project_id && !item.icon_url && !item.iconUrl)
          .map((item: any) => item.project_id);
        if (missingIconIds.length) {
          const icons = await fetchDraftIcons(missingIconIds);
          items = items.map((item: any) => ({
            ...item,
            icon_url: item.icon_url || item.iconUrl || icons[item.project_id],
          }));
        }
      }

      // Fetch actual game versions and loaders from Modrinth in batch if versions are set
      const versionIds = items.map((item: any) => item.version_id).filter(Boolean);
      let versionsMap: Record<string, { game_versions: string[]; loaders: string[] }> = {};
      if (versionIds.length) {
        try {
          const res = await fetch(`https://api.modrinth.com/v2/versions?ids=${encodeURIComponent(JSON.stringify(versionIds))}`);
          if (res.ok) {
            const versionsData = await res.json();
            versionsData.forEach((v: any) => {
              versionsMap[v.id] = {
                game_versions: v.game_versions || [],
                loaders: v.loaders || [],
              };
            });
          }
        } catch (vErr) {
          console.error("Error fetching version metadata from Modrinth:", vErr);
        }
      }

      setActiveCollectionMods((items || []).map((item: any) => {
        const actualVersionInfo = item.version_id ? versionsMap[item.version_id] : null;
        return {
          itemId: item.id,
          projectId: item.project_id,
          title: item.name || item.mod_name || item.project_id,
          description: "",
          iconUrl: item.icon_url || item.iconUrl || undefined,
          author: "Comunidad",
          projectType: item.content_type || item.category || "mod",
          categories: [item.category || item.content_type].filter(Boolean),
          url: `https://modrinth.com/${item.content_type || item.category || "mod"}/${item.project_id}`,
          _source: "modrinth",
          gameVersions: actualVersionInfo?.game_versions || item.game_versions || [draft.minecraft_version].filter(Boolean),
          loaders: actualVersionInfo?.loaders || item.loaders || [draft.loader].filter(Boolean),
          side: item.side || "both",
          versionId: item.version_id || null,
        };
      }));
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

  const runDiscoverSearch = useCallback(async (pageNumber = 1, overrideQuery?: string, overrideSource?: "modrinth" | "curseforge" | "all") => {
    try {
      setDiscoverLoading(true);
      setDiscoverError("");
      
      const activeSource = overrideSource || discoverSource;
      const activeQuery = overrideQuery !== undefined ? overrideQuery : discoverQuery;
      
      const gameVersions = Array.isArray(discoverVersion) ? discoverVersion : [];
      const selectedLoaders = Array.isArray(discoverLoader) ? discoverLoader : [];
      const categories = discoverCategory.length > 0 ? discoverCategory : [];
      const environments = discoverEnvironment && discoverEnvironment !== "any" ? [discoverEnvironment] : [];

      const queryParams = new URLSearchParams({
        projectType: discoverType,
        loader: selectedLoaders.length > 0 ? selectedLoaders.join(",") : "any",
        page: String(pageNumber),
        pageSize: "12",
        q: activeQuery,
        sort: discoverSort,
        gameVersions: JSON.stringify(gameVersions),
        categories: JSON.stringify(categories),
        environments: JSON.stringify(environments)
      });

      let mapped: ModHit[] = [];
      let totalHits = 0;

      if (activeSource === "all") {
        const [mRes, cRes] = await Promise.allSettled([
          fetch(`/api/modrinth/discover?${queryParams.toString()}`),
          fetch(`/api/curseforge/discover?${queryParams.toString()}`)
        ]);

        let mMods: ModHit[] = [];
        let cMods: ModHit[] = [];
        let mTotal = 0;
        let cTotal = 0;

        if (mRes.status === "fulfilled" && mRes.value.ok) {
          const d = await mRes.value.json();
          mMods = (d.mods || []).map((m: any) => ({ ...m, _source: "modrinth" }));
          mTotal = d.total || 0;
        }
        if (cRes.status === "fulfilled" && cRes.value.ok) {
          const d = await cRes.value.json();
          cMods = (d.mods || []).map((m: any) => ({ ...m, _source: "curseforge" }));
          cTotal = d.total || 0;
        }

        // Interleave the results for a unified discovery experience
        const maxLength = Math.max(mMods.length, cMods.length);
        for (let i = 0; i < maxLength; i++) {
          if (i < mMods.length) mapped.push(mMods[i]);
          if (i < cMods.length) mapped.push(cMods[i]);
        }
        totalHits = mTotal + cTotal;
      } else if (activeSource === "curseforge") {
        const res = await fetch(`/api/curseforge/discover?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error("Error en la API de CurseForge");
        }
        const data = await res.json();
        mapped = (data.mods || []).map((m: any) => ({ ...m, _source: "curseforge" }));
        totalHits = data.total || 0;
      } else {
        // Modrinth
        const res = await fetch(`/api/modrinth/discover?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error("Error en la API de Modrinth");
        }
        const data = await res.json();
        mapped = (data.mods || []).map((m: any) => ({ ...m, _source: "modrinth" }));
        totalHits = data.total || 0;
      }

      setDiscoverResults(mapped);
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
  }, [discoverQuery, discoverType, discoverVersion, discoverLoader, discoverSource, discoverEnvironment, discoverCategory, discoverSort]);

  const handleSearchAuthor = useCallback((authorName: string, platform: string) => {
    const cleanPlatform = (platform === "curseforge" || platform === "all" || platform === "modrinth") ? platform : "modrinth";
    const isOrg = authorName.startsWith("organization:");
    const authorQuery = isOrg ? authorName : `author:${authorName}`;
    setDiscoverQuery(authorQuery);
    setDiscoverSource(cleanPlatform);
    setDiscoverCategory([]);
    setDiscoverResults([]);
    setDiscoverPage(1);
    setActiveTab("discover");
    
    // Close modal
    setSelectedMod(null);
    setSelectedModDetails(null);
    setSelectedModDeps([]);
    setModStack([]);
    setActiveStackIndex(-1);

    // Run search immediately
    void runDiscoverSearch(1, authorQuery, cleanPlatform);
  }, [runDiscoverSearch]);

  const handleSearchMod = useCallback((title: string) => {
    setDiscoverQuery(title);
    setDiscoverSource("all");
    setDiscoverType("any");
    setDiscoverVersion([]);
    setDiscoverLoader([]);
    setDiscoverEnvironment("any");
    setDiscoverCategory([]);
    setDiscoverResults([]);
    setDiscoverPage(1);
    setActiveTab("discover");

    // Close modal
    setSelectedMod(null);
    setSelectedModDetails(null);
    setSelectedModDeps([]);
    setModStack([]);
    setActiveStackIndex(-1);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

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
      if (!initialSearchSkippedRef.current) {
        initialSearchSkippedRef.current = true;
      } else {
        void runDiscoverSearch(discoverPage);
      }
    }
  }, [
    isLoaded,
    activeTab,
    currentChannel,
    youtubeFeedType,
    loadSpotlightData,
    loadCollections,
    loadRankingsData,
    loadYoutubeData,
    runDiscoverSearch,
    discoverPage
  ]);

  const handleOpenModDetails = async (mod: ModHit, isDependency = false) => {
    const normalizedMod = mod.projectId ? mod : normalizeFavorite(mod);
    setSelectedMod(normalizedMod);
    setSelectedModDetails(null);
    setSelectedModDeps([]);
    setLoadingDetails(true);
    setModalTab("summary");

    let details = null;
    let depsData: any[] = [];
    let realAuthor: string | null = null;

    try {
      if (normalizedMod._source === "curseforge") {
        const res = await fetch(`/api/curseforge/project?projectId=${normalizedMod.projectId}`);
        if (res.ok) {
          const data = await res.json();
          details = data.details;
          depsData = data.dependencies || [];
          setSelectedModDetails(details);
          setSelectedModDeps(depsData);
          if (details?.authors && details.authors.length > 0) {
            realAuthor = details.authors[0].name;
          }
        }
      } else {
        const [pRes, dRes, vRes] = await Promise.all([
          fetch(`/api/modrinth/project?projectId=${normalizedMod.projectId}`),
          fetch(`https://api.modrinth.com/v2/project/${normalizedMod.projectId}/dependencies`),
          fetch(`https://api.modrinth.com/v2/project/${normalizedMod.projectId}/version`),
        ]);
        let versionsData: any[] = [];
        if (pRes.ok) {
          details = await pRes.json();
          if (details?.team) {
            try {
              const teamRes = await fetch(`https://api.modrinth.com/v2/team/${details.team}/members`);
              if (teamRes.ok) {
                const members = await teamRes.json();
                const owner = members.find((m: any) => m.role?.toLowerCase() === "owner" || m.is_owner) || members[0];
                if (owner?.user?.username) {
                  realAuthor = owner.user.username;
                }
              }
            } catch (e) {
              console.error("Error resolving Modrinth team members:", e);
            }
          }
        }
        if (vRes.ok) {
          versionsData = await vRes.json();
        }
        if (details) {
          details = {
            ...details,
            versions: versionsData,
            updated_at: details.updated_at || versionsData[0]?.date_published || null,
          };
          setSelectedModDetails(details);
        }
        if (dRes.ok) {
          const dependencyTypeMap = buildDependencyTypeMap(versionsData);
          depsData = attachDependencyTypes((await dRes.json()).projects || [], dependencyTypeMap);
          setSelectedModDeps(depsData);
        }
      }
    } catch (err) {
      console.error("Failed to load mod detailed metadata:", err);
    } finally {
      let modChanged = false;
      if (realAuthor) {
        normalizedMod.author = realAuthor;
        modChanged = true;
      }
      const resolvedIcon = details?.icon_url || details?.iconUrl;
      if (resolvedIcon && !normalizedMod.iconUrl) {
        normalizedMod.iconUrl = resolvedIcon;
        modChanged = true;
      }
      if (modChanged) {
        setSelectedMod({ ...normalizedMod });
      }
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

      // Log activity
      await supabase.from("draft_activity").insert({
        draft_id: draftId,
        profile_id: session.user.id,
        action: `añadió ${contentType === "resourcepack" ? "una textura" : contentType === "shader" ? "un shader" : contentType === "datapack" ? "un datapack" : "un mod"}`,
        payload: { name: mod.title || mod.projectId, type: contentType, project_id: mod.projectId },
      });

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
    // Capture the mod name before deleting for activity log
    const draftObj = userDrafts.find((d) => d.id === draftId);
    const itemMeta = (draftObj?.items || []).find(
      (i: any) => (itemId && i.id === itemId) || i.project_id === projectId
    );
    const query = supabase.from("draft_items").delete();
    const { error } = itemId
      ? await query.eq("id", itemId)
      : await query.eq("draft_id", draftId).eq("project_id", projectId);
    if (error) {
      showAlert("Error", `Error al eliminar del draft: ${error.message}`);
    } else {
      // Log activity
      await supabase.from("draft_activity").insert({
        draft_id: draftId,
        profile_id: session.user.id,
        action: "eliminó un ítem",
        payload: {
          name: itemMeta?.name || itemMeta?.mod_name || projectId,
          type: itemMeta?.content_type || itemMeta?.category || "mod",
          project_id: projectId,
        },
      });
    }
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

  /** Update draft details (name, version, loader, visibility) and log activity */
  const updateDraftMetadata = async (
    draftId: string,
    updates: { name?: string; minecraft_version?: string; loader?: string; visibility?: string }
  ): Promise<boolean> => {
    if (!session?.user?.id) return false;
    const { error } = await supabase
      .from("drafts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", draftId);
    if (error) {
      showAlert("Error", `No se pudo guardar la configuración: ${error.message}`);
      return false;
    }

    // Construct a list of what changed for the activity log
    const changedFields: string[] = [];
    if (updates.name) changedFields.push("nombre");
    if (updates.minecraft_version) changedFields.push("versión");
    if (updates.loader) changedFields.push("loader");
    if (updates.visibility) changedFields.push("visibilidad");

    const actionText = changedFields.length
      ? `actualizó la configuración (${changedFields.join(", ")})`
      : "actualizó el draft";

    await supabase.from("draft_activity").insert({
      draft_id: draftId,
      profile_id: session.user.id,
      action: actionText,
      payload: updates,
    });
    
    await loadUserData(session.user.id);
    return true;
  };

  const onToggleFavorite = async (mod: ModHit) => {
    if (!session?.user?.id) return;
    const previousFavorites = userFavorites;
    const userId = session.user.id;
    const favoriteId = mod.projectId;
    const isFav = userFavorites.some((f) => (f.mod_id || f.project_id || f.id) === favoriteId);

    setUserFavorites((prev) => {
      const withoutCurrent = prev.filter((f) => (f.mod_id || f.project_id || f.id) !== favoriteId);
      if (isFav) return withoutCurrent;

      return [
        {
          id: `optimistic-${favoriteId}`,
          profile_id: userId,
          mod_id: favoriteId,
          project_id: favoriteId,
          name: mod.author ? `${mod.title} ::: ${mod.author}` : mod.title,
          icon_url: mod.iconUrl || null,
          platform: mod._source || "modrinth",
          project_type: mod.projectType || "mod",
          created_at: new Date().toISOString(),
        },
        ...withoutCurrent,
      ];
    });

    try {
      const request = isFav
        ? supabase.from("followed_mods").delete().eq("profile_id", userId).eq("mod_id", favoriteId)
        : supabase.from("followed_mods").insert({
          profile_id: userId,
          mod_id: favoriteId,
          name: mod.author ? `${mod.title} ::: ${mod.author}` : mod.title,
          icon_url: mod.iconUrl || null,
          platform: mod._source || "modrinth",
        });
      const { error } = await request;
      if (error) throw error;
      await loadUserData(userId);
    } catch (err: any) {
      setUserFavorites(previousFavorites);
      showAlert("Error", `Error al guardar favorito: ${err.message}`);
    }
  };

  /** Follow or unfollow an author by name, saving to followed_authors table */
  const onToggleFollowAuthor = async (authorName: string, authorUrl?: string, iconUrl?: string, platform?: string) => {
    if (!session?.user?.id || !authorName) return;
    try {
      const pl = platform || "modrinth";
      const isFollowing = userFollowedAuthors.some(
        (a) => a.author_name === authorName && a.platform === pl
      );
      const request = isFollowing
        ? supabase.from("followed_authors").delete()
            .eq("profile_id", session.user.id)
            .eq("author_name", authorName)
            .eq("platform", pl)
        : supabase.from("followed_authors").insert({
            profile_id: session.user.id,
            author_name: authorName,
            author_url: authorUrl || null,
            icon_url: iconUrl || null,
            platform: pl,
          });
      const { error } = await request;
      if (error) throw error;
      await loadUserData(session.user.id, true);
    } catch (err: any) {
      showAlert("Error", `Error al seguir autor: ${err.message}`);
    }
  };

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const onRemoveShare = async (shareId: string) => {
    if (!session?.user?.id) return;
    try {
      const isUuid = UUID_REGEX.test(shareId);
      let query = supabase.from("favorite_mods").delete();
      if (isUuid) {
        query = query.eq("id", shareId);
      } else {
        query = query.eq("profile_id", session.user.id).eq("mod_id", shareId);
      }
      const { error } = await query;
      if (error) throw error;
      
      setUserShares(prev => prev.filter(item => {
        const itemId = item.id;
        const itemModId = item.mod_id || item.project_id;
        return isUuid ? itemId !== shareId : itemModId !== shareId;
      }));
      await loadUserData(session.user.id, true);
    } catch (err: any) {
      showAlert("Error", `Error al eliminar compartido: ${err.message}`);
    }
  };

  const onUpdateSharePriority = async (shareId: string, priority: boolean) => {
    if (!session?.user?.id) return;
    const isUuid = UUID_REGEX.test(shareId);
    const previousShares = userShares;

    const currentShare = userShares.find((item) =>
      isUuid ? item.id === shareId : (item.mod_id || item.project_id || item.id) === shareId
    );
    if (!currentShare) return;

    // Optimistic update — immediately reorder in UI so the pin feels instant.
    setUserShares((items) =>
      sortSharesByPriority(
        items.map((item) => {
          const match = isUuid ? item.id === shareId : (item.mod_id || item.project_id || item.id) === shareId;
          return match ? { ...item, pinned: priority } : item;
        })
      )
    );

    try {
      let query = supabase.from("favorite_mods").update({ pinned: priority });
      if (isUuid) {
        query = query.eq("id", shareId);
      } else {
        query = query.eq("profile_id", session.user.id).eq("mod_id", shareId);
      }
      const { error } = await query.select("id,pinned").single();
      if (error) throw error;
    } catch (err: any) {
      setUserShares(previousShares);
      showAlert("Error", `No se pudo actualizar la prioridad: ${err.message}`);
    }
  };

  const shareYoutubePost = async (post: any) => {
    if (!session?.user?.id) {
      showAlert("Iniciá sesión", "Necesitás iniciar sesión para compartir contenido con la comunidad.");
      return;
    }

    const postId = post?.postId || post?.embeddedVideoId;
    if (!postId) {
      showAlert("Sin contenido", "No encontré un identificador válido para compartir este contenido.");
      return;
    }

    const userId = session.user.id;
    const projectId = `youtube:${postId}`;
    const title = post.title || (post.mode === "short" ? "Short de YouTube" : post.mode === "post" ? "Publicación de YouTube" : "Video de YouTube");
    const videoUrl = post.videoUrl || (post.embeddedVideoId ? `https://www.youtube.com/watch?v=${post.embeddedVideoId}` : currentChannel);
    const thumbnail = post.thumbnail || (post.embeddedVideoId ? `https://i.ytimg.com/vi/${post.embeddedVideoId}/mqdefault.jpg` : null);
    const contentKind = post.mode === "short" || post.mode === "video-short"
      ? "youtube-short"
      : post.mode === "post"
        ? "youtube-post"
        : "youtube-video";
    const existingShare = userShares.find((share) => (share.mod_id || share.project_id || share.id) === projectId);
    const summary = JSON.stringify({
      comment: post.description || "",
      projectType: contentKind,
      videoUrl,
      thumbnail,
      embeddedVideoId: post.embeddedVideoId || null,
      mode: post.mode || "video",
      publishedAt: post.publishedAt || "",
      channelUrl: currentChannel,
    });
    const previousShares = userShares;
    const alreadyShared = userShares.some((share) => (share.mod_id || share.project_id || share.id) === projectId);

    setUserShares((prev) => [
      {
        id: alreadyShared ? prev.find((share) => (share.mod_id || share.project_id || share.id) === projectId)?.id || `optimistic-${projectId}` : `optimistic-${projectId}`,
        profile_id: userId,
        mod_id: projectId,
        platform: "youtube",
        name: title,
        icon_url: thumbnail,
        summary,
        pinned: existingShare?.pinned ?? false,
        created_at: new Date().toISOString(),
      },
      ...prev.filter((share) => (share.mod_id || share.project_id || share.id) !== projectId),
    ]);

    const saveShare = (platform: "youtube" | "modrinth") => {
      const payload = {
        platform,
        name: title,
        icon_url: thumbnail,
        summary,
        pinned: existingShare?.pinned ?? false,
      };

      return alreadyShared
        ? supabase.from("favorite_mods").update(payload).eq("profile_id", userId).eq("mod_id", projectId)
        : supabase.from("favorite_mods").insert({
          profile_id: userId,
          mod_id: projectId,
          ...payload,
        });
    };

    try {
      const { error } = await saveShare("youtube");
      if (error) {
        if (!isFavoritePlatformConstraintError(error)) throw error;
        const { error: fallbackError } = await saveShare("modrinth");
        if (fallbackError) throw fallbackError;
      }
      await loadUserData(userId);
    } catch (err: any) {
      setUserShares(previousShares);
      showAlert("Error", `No se pudo compartir: ${err.message}`);
    }
  };

  return {
    activeTab, setActiveTab, selectedMod, selectedModDetails, selectedModDeps, loadingDetails, modalTab, setModalTab,
    modStack, activeStackIndex, discoverQuery, setDiscoverQuery, discoverType, setDiscoverType, discoverVersion,
    setDiscoverVersion, discoverLoader, setDiscoverLoader, discoverEnvironment, setDiscoverEnvironment, discoverCategory, setDiscoverCategory, discoverSort, setDiscoverSort, discoverResults, setDiscoverResults, discoverLoading,
    discoverPage, setDiscoverPage, discoverTotal, discoverSource, setDiscoverSource, discoverError, session, email, setEmail, password, setPassword, username,
    setUsername, isRegistering, setIsRegistering, authLoading, profile, setProfile, showEditProfile, setShowEditProfile,
    showcaseChannels, showChannelPicker, setShowChannelPicker, userFavorites, userShares, userDrafts, userFollowedAuthors, loadingUserData,
    updatedMods, newestMods, modrinthFeatured, curseForgeFeatured, curseForgeCollections, latestFeaturedMods, latestCollectionName,
    loadingLatestMods, activeSpotlightPlatform, setActiveSpotlightPlatform, activeCollection, activeCollectionMods,
    loadingActiveMods, theme, customAlert, setCustomAlert, youtubePosts, loadingYoutube, currentChannel,
    setCurrentChannel, youtubeFeedType, setYoutubeFeedType, followedChannels, showChannelManager, setShowChannelManager, newChannelInput, setNewChannelInput,
    rankings, loadingRankings, showDraftPicker, setShowDraftPicker, pendingMod, setPendingMod, handleThemeChange,
    handleSaveShowcaseChannels, handleAuth, handleLogout: () => supabase.auth.signOut(), handleAddChannel,
    handleRemoveChannel, handleEnterCollection, handleExitCollection: () => { setActiveCollection(null); setActiveCollectionMods([]); },
    handleEnterDraftCollection, runDiscoverSearch, handleOpenModDetails, handleSwitchStackIndex,
    handleGoBackInStack: () => activeStackIndex > 0 && handleSwitchStackIndex(activeStackIndex - 1),
    handleCloseModDetails: () => { setSelectedMod(null); setSelectedModDetails(null); setSelectedModDeps([]); setModStack([]); setActiveStackIndex(-1); },
    createDraft, addModToDraft, removeModFromDraft, recategorizeDraftItem, updateDraftItemSide, updateDraftCover, deleteDraft, updateDraftMetadata, onToggleFavorite, onToggleFollowAuthor,
    onRemoveShare, onUpdateSharePriority, shareYoutubePost,
    handleToggleChannelVisibility,
    refreshUserData: () => session?.user?.id && void loadUserData(session.user.id),
    activeDraft, setActiveDraft, handleSearchAuthor, handleSearchMod,
  };
}
