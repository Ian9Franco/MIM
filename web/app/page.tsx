"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, Calendar, Compass, Share2, Award, Film, Loader2, User, Key, Mail, LogOut, Check, ChevronRight, Bookmark, ExternalLink, X, ArrowLeft, Layers, Search, SlidersHorizontal, Heart, Download, Coffee, Ghost, Sun, Pencil, Palette, Plus, Trash2, Settings2, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "../components/BottomNav";
import { VerticalTicker, HorizontalEditorialMarquee, HorizontalShowcaseMarquee, ModHit } from "../components/SpotlightMarquees";
import { mockUpdatedMods, mockNewestMods } from "../lib/mockData";
import { supabase } from "../lib/supabaseClient";

interface CollectionItem {
  id: string;
  name: string;
  description: string;
  projectCount: number;
  iconUrl?: string;
  source: "modrinth" | "curseforge";
  previewIcons?: string[];
  mods?: ModHit[]; // Loaded for static/CurseForge picks, or dynamically fetched
}

const resizeAndCompressImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG at 0.75 quality
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("profile"); // Default to Profile/Login first
  const [selectedMod, setSelectedMod] = useState<ModHit | null>(null);

  // Mod Details Fetch State
  const [selectedModDetails, setSelectedModDetails] = useState<any>(null);
  const [selectedModDeps, setSelectedModDeps] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Discover Tab State
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverType, setDiscoverType] = useState("mod"); // 'mod' | 'resourcepack' | 'datapack' | 'shader'
  const [discoverVersion, setDiscoverVersion] = useState("1.20.1"); // Default to 1.20.1
  const [discoverLoader, setDiscoverLoader] = useState("fabric"); // fabric | forge | neoforge | quilt | any
  const [discoverResults, setDiscoverResults] = useState<ModHit[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverTotal, setDiscoverTotal] = useState(0);

  // Auth State
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Profile Edit State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string>("")
  const [editBannerUrl, setEditBannerUrl] = useState<string>("");
  const [editColor, setEditColor] = useState("#F05A28");
  const [savingProfile, setSavingProfile] = useState(false);
  const [editProfileStatus, setEditProfileStatus] = useState<{msg: string; ok: boolean} | null>(null);

  // Showcase Customization State
  const [showcaseChannels, setShowcaseChannels] = useState<string[]>([]);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [newShowcaseChannelInput, setNewShowcaseChannelInput] = useState("");

  // User Profile Data Cloud State
  const [userFavorites, setUserFavorites] = useState<any[]>([]);
  const [userDrafts, setUserDrafts] = useState<any[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);

  // Spotlight Live Data State
  const [updatedMods, setUpdatedMods] = useState<ModHit[]>(mockUpdatedMods);
  const [newestMods, setNewestMods] = useState<ModHit[]>(mockNewestMods);
  const [loadingSpotlight, setLoadingSpotlight] = useState(false);

  // Featured Collections & Latest Collection Mods (Desktop Spotlight style)
  const [modrinthFeatured, setModrinthFeatured] = useState<CollectionItem[]>([]);
  const [curseForgeFeatured, setCurseForgeFeatured] = useState<CollectionItem[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  
  // Mods inside the latest collection for Spotlight hero row
  const [latestFeaturedMods, setLatestFeaturedMods] = useState<ModHit[]>([]);
  const [latestCollectionName, setLatestCollectionName] = useState("");
  const [loadingLatestMods, setLoadingLatestMods] = useState(false);
  const [activeSpotlightPlatform, setActiveSpotlightPlatform] = useState<"modrinth" | "curseforge">("modrinth");

  // Active Collection View state (for "entering" collections in mobile)
  const [activeCollection, setActiveCollection] = useState<CollectionItem | null>(null);
  const [activeCollectionMods, setActiveCollectionMods] = useState<ModHit[]>([]);
  const [loadingActiveMods, setLoadingActiveMods] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<"official" | "vampire" | "modern">("official");
  const [modStack, setModStack] = useState<any[]>([]);
  const [activeStackIndex, setActiveStackIndex] = useState<number>(-1);

  // Custom Alert Modal State
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string } | null>(null);

  // Tab inside Mod Details Modal
  const [modalTab, setModalTab] = useState<"summary" | "desc" | "versions" | "deps">("summary");

  // YouTube Live Data State
  const [youtubePosts, setYoutubePosts] = useState<any[]>([]);
  const [loadingYoutube, setLoadingYoutube] = useState(false);
  const [currentChannel, setCurrentChannel] = useState("https://www.youtube.com/@EnderVerseMC");
  const [followedChannels, setFollowedChannels] = useState<{ name: string; url: string }[]>([
    { name: "Wero Lovernite", url: "https://www.youtube.com/@Wero_lovernite" },
    { name: "EnderVerseMC", url: "https://www.youtube.com/@EnderVerseMC" }
  ]);
  const [showChannelManager, setShowChannelManager] = useState(false);
  const [newChannelInput, setNewChannelInput] = useState("");

  // Rankings Live Data State
  const [rankings, setRankings] = useState<ModHit[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTHENTICATION LOGIC (Supabase)
  // ─────────────────────────────────────────────────────────────────────────────
  const showAlert = (title: string, message: string) => {
    setCustomAlert({ title, message });
  };

  useEffect(() => {
    const saved = localStorage.getItem("mim-theme") as any;
    if (saved && ["official", "vampire", "modern"].includes(saved)) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("mim_spotlight_showcase_channels");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setShowcaseChannels(parsed);
          return;
        }
      } catch {}
    }
    setShowcaseChannels([
      "https://www.youtube.com/@EnderVerseMC",
      "https://www.youtube.com/@KreksuMinecraft",
      "https://www.youtube.com/@NoxusMods",
      "https://www.youtube.com/@sir_color",
      "https://www.youtube.com/@Wero_lovernite",
    ]);
  }, []);

  const handleThemeChange = async (newTheme: "official" | "vampire" | "modern") => {
    setTheme(newTheme);
    localStorage.setItem("mim-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);

    if (session?.user?.id) {
      try {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("banner_meta")
          .eq("id", session.user.id)
          .single();

        const updatedBannerMeta = {
          ...(currentProfile?.banner_meta || {}),
          theme: newTheme
        };

        await supabase
          .from("profiles")
          .update({
            banner_meta: updatedBannerMeta,
            updated_at: new Date().toISOString()
          })
          .eq("id", session.user.id);
      } catch (err) {
        console.error("Error syncing theme to Supabase:", err);
      }
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      setLoadingUserData(true);
      
      const { data: profData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (profData) {
        setProfile(profData);
        if (profData.banner_meta?.youtube_channels && Array.isArray(profData.banner_meta.youtube_channels)) {
          setFollowedChannels(profData.banner_meta.youtube_channels);
        }
        if (profData.banner_meta?.theme && ["official", "vampire", "modern"].includes(profData.banner_meta.theme)) {
          const cloudTheme = profData.banner_meta.theme;
          setTheme(cloudTheme);
          localStorage.setItem("mim-theme", cloudTheme);
          document.documentElement.setAttribute("data-theme", cloudTheme);
        }
      }

      const { data: favs } = await supabase
        .from("favorite_mods")
        .select("*")
        .eq("profile_id", userId);
      
      if (favs) setUserFavorites(favs);

      const { data: drafts } = await supabase
        .from("drafts")
        .select("*")
        .eq("owner_id", userId);

      if (drafts) setUserDrafts(drafts);
    } catch (e) {
      console.error("Error loading user cloud data:", e);
    } finally {
      setLoadingUserData(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      loadUserData(session.user.id);
    } else {
      setProfile(null);
      setUserFavorites([]);
      setUserDrafts([]);
      
      const saved = localStorage.getItem("mim_web_youtube_channels");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFollowedChannels(parsed);
          }
        } catch {}
      } else {
        setFollowedChannels([
          { name: "Wero Lovernite", url: "https://www.youtube.com/@Wero_lovernite" },
          { name: "EnderVerseMC", url: "https://www.youtube.com/@EnderVerseMC" }
        ]);
      }
    }
  }, [session, loadUserData]);

  useEffect(() => {
    if (followedChannels.length > 0) {
      const urls = followedChannels.map(c => c.url);
      if (!urls.includes(currentChannel)) {
        setCurrentChannel(followedChannels[0].url);
      }
    }
  }, [followedChannels, currentChannel]);

  const handleAddChannel = async () => {
    const raw = newChannelInput.trim();
    if (!raw) return;
    
    let handle = raw;
    if (handle.startsWith("http")) {
      const parts = handle.split("@");
      if (parts.length > 1) {
        handle = "@" + parts[1].split("/")[0];
      } else {
        handle = handle.split("/").pop() || handle;
      }
    }
    if (!handle.startsWith("@") && !handle.startsWith("http")) {
      handle = "@" + handle;
    }
    
    let url = raw.startsWith("http") ? raw : `https://www.youtube.com/${handle}`;
    url = url.replace(/\/$/, "");
    
    if (followedChannels.some((c) => c.url.toLowerCase() === url.toLowerCase())) {
      showAlert("Canal Ya Existe", "Este canal ya está en tu lista.");
      return;
    }

    const newChan = { name: handle, url: url };
    const updated = [...followedChannels, newChan];
    setFollowedChannels(updated);
    setNewChannelInput("");
    setCurrentChannel(url);

    if (session?.user?.id) {
      const { error } = await supabase
        .from("profiles")
        .update({
          banner_meta: {
            ...profile?.banner_meta,
            youtube_channels: updated
          }
        })
        .eq("id", session.user.id);
      if (error) {
        console.error("Error updating profile channels:", error);
      } else {
        setProfile((prev: any) => ({
          ...prev,
          banner_meta: {
            ...prev?.banner_meta,
            youtube_channels: updated
          }
        }));
      }
    } else {
      localStorage.setItem("mim_web_youtube_channels", JSON.stringify(updated));
    }
  };

  const handleRemoveChannel = async (urlToRemove: string) => {
    if (followedChannels.length <= 1) {
      showAlert("Mínimo Requerido", "Debes tener al menos un canal en tu lista.");
      return;
    }

    const updated = followedChannels.filter((c) => c.url !== urlToRemove);
    setFollowedChannels(updated);

    if (currentChannel === urlToRemove && updated.length > 0) {
      setCurrentChannel(updated[0].url);
    }

    if (session?.user?.id) {
      const { error } = await supabase
        .from("profiles")
        .update({
          banner_meta: {
            ...profile?.banner_meta,
            youtube_channels: updated
          }
        })
        .eq("id", session.user.id);
      if (error) {
        console.error("Error updating profile channels:", error);
      } else {
        setProfile((prev: any) => ({
          ...prev,
          banner_meta: {
            ...prev?.banner_meta,
            youtube_channels: updated
          }
        }));
      }
    } else {
      localStorage.setItem("mim_web_youtube_channels", JSON.stringify(updated));
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    try {
      setAuthLoading(true);
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username || email.split("@")[0] }
          }
        });
        if (error) throw error;
        showAlert("Registro Exitoso", "¡Registro exitoso! Iniciando sesión...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      showAlert("Error de Autenticación", err.message || "Error en la autenticación");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  /** Open the edit profile modal, pre-filling current values */
  const handleOpenEditProfile = () => {
    setEditUsername(profile?.username || "");
    setEditAvatarUrl(profile?.avatar_url || "");
    setEditBannerUrl(profile?.banner_url || "");
    setEditColor(profile?.color || "#F05A28");
    setEditProfileStatus(null);
    setShowEditProfile(true);
  };

  /** Save updated profile fields to Supabase */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    setSavingProfile(true);
    setEditProfileStatus(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: editUsername.trim() || profile?.username,
          avatar_url: editAvatarUrl.trim() || null,
          banner_url: editBannerUrl.trim() || null,
          color: editColor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);
      if (error) throw error;
      // Re-fetch updated profile
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (updatedProfile) setProfile(updatedProfile);
      setEditProfileStatus({ msg: "¡Perfil actualizado con éxito!", ok: true });
      setTimeout(() => setShowEditProfile(false), 1200);
    } catch (err: any) {
      setEditProfileStatus({ msg: err.message || "Error al guardar", ok: false });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveShowcaseChannels = (newChannels: string[]) => {
    setShowcaseChannels(newChannels);
    localStorage.setItem("mim_spotlight_showcase_channels", JSON.stringify(newChannels));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA FETCHING LOGIC
  // ─────────────────────────────────────────────────────────────────────────────

  // Fetch official collections
  const loadCollections = useCallback(async () => {
    try {
      setLoadingCollections(true);
      const mrPromise = fetch("/api/modrinth/official").then(r => r.json());
      const cfPromise = fetch("/api/curseforge/picks").then(r => r.json());

      const [mrRes, cfRes] = await Promise.all([mrPromise, cfPromise]);
      const mrColls = mrRes.collections || [];
      const cfPicks = cfRes.picks || [];

      setModrinthFeatured(mrColls);
      setCurseForgeFeatured(cfPicks);

      // Grab the latest featured collection to show its mods inside Spotlight (similar to desktop)
      if (mrColls.length > 0) {
        const latest = mrColls[0];
        setLatestCollectionName(latest.name);
        loadCollectionMods(latest, true);
      }
    } catch (e) {
      console.error("Error loading collections:", e);
    } finally {
      setLoadingCollections(false);
    }
  }, []);

  // Fetch mods for a specific collection
  const loadCollectionMods = async (collection: CollectionItem, isSpotlightHero = false) => {
    try {
      if (isSpotlightHero) setLoadingLatestMods(true);
      else setLoadingActiveMods(true);

      // If it's CurseForge, they are pre-packaged statically
      if (collection.source === "curseforge" && collection.mods) {
        if (isSpotlightHero) setLatestFeaturedMods(collection.mods);
        else setActiveCollectionMods(collection.mods);
        return;
      }

      // If Modrinth, fetch the projects from their API proxy
      // Let's call the official Modrinth v2 API using the preview IDs or project list
      // In Modrinth official route, we list the collections. 
      // We can fetch mod projects in batch.
      const collRes = await fetch(`https://api.modrinth.com/v3/user/modrinth/collections`);
      if (collRes.ok) {
        const colls = await collRes.json();
        const found = colls.find((c: any) => c.id === collection.id);
        const projectIds = found?.projects || [];
        
        if (projectIds.length > 0) {
          const limitIds = projectIds.slice(0, 15);
          const pRes = await fetch(`https://api.modrinth.com/v2/projects?ids=${JSON.stringify(limitIds)}`);
          if (pRes.ok) {
            const projects = await pRes.json();
            const mappedMods = projects.map((m: any) => ({
              projectId: m.id,
              title: m.title,
              description: m.description,
              iconUrl: m.icon_url,
              author: m.author || "Creador",
              projectType: m.project_type,
              categories: m.categories,
              url: `https://modrinth.com/${m.project_type}/${m.slug}`,
              _source: "modrinth"
            }));

            if (isSpotlightHero) setLatestFeaturedMods(mappedMods);
            else setActiveCollectionMods(mappedMods);
            return;
          }
        }
      }

      // Fallback
      if (isSpotlightHero) setLatestFeaturedMods(mockUpdatedMods.slice(0, 5));
      else setActiveCollectionMods(mockUpdatedMods.slice(0, 6));
    } catch (e) {
      console.error("Failed to load collection mods:", e);
    } finally {
      if (isSpotlightHero) setLoadingLatestMods(false);
      else setLoadingActiveMods(false);
    }
  };

  // Click on a collection card -> open detailed collection subview
  const handleEnterCollection = (collection: CollectionItem) => {
    setActiveCollection(collection);
    setActiveCollectionMods([]);
    loadCollectionMods(collection, false);
  };

  const handleExitCollection = () => {
    setActiveCollection(null);
    setActiveCollectionMods([]);
  };

  // Fetch Spotlight (tickers data)
  const loadSpotlightData = useCallback(async () => {
    try {
      setLoadingSpotlight(true);
      const facets = encodeURIComponent('[["versions:1.20.1"],["categories:fabric"]]');
      
      const updatedPromise = fetch(`https://api.modrinth.com/v2/search?index=updated&limit=12&facets=${facets}`).then(r => r.json());
      const newestPromise = fetch(`https://api.modrinth.com/v2/search?index=newest&limit=12&facets=${facets}`).then(r => r.json());

      const [updatedRes, newestRes] = await Promise.all([updatedPromise, newestPromise]);

      const mapHits = (hits: any[], defaultBackup: ModHit[]) => {
        if (!hits || !Array.isArray(hits) || hits.length === 0) return defaultBackup;
        return hits.map((m: any) => ({
          projectId: m.project_id,
          title: m.title,
          description: m.description,
          iconUrl: m.icon_url,
          author: m.author,
          projectType: m.project_type,
          categories: m.categories,
          url: `https://modrinth.com/${m.project_type}/${m.slug}`,
          _source: "modrinth"
        }));
      };

      setUpdatedMods(mapHits(updatedRes.hits, mockUpdatedMods));
      setNewestMods(mapHits(newestRes.hits, mockNewestMods));
    } catch (e) {
      console.error("Error loading live Modrinth data:", e);
    } finally {
      setLoadingSpotlight(false);
    }
  }, []);

  // Fetch community rankings
  const loadRankingsData = useCallback(async () => {
    try {
      setLoadingRankings(true);
      const res = await fetch("/api/fomo/community-rankings");
      if (res.ok) {
        const d = await res.json();
        setRankings(d.rankings || []);
      }
    } catch (e) {
      console.error("Error fetching community rankings:", e);
    } finally {
      setLoadingRankings(false);
    }
  }, []);

  // Fetch YouTube community showcase
  const loadYoutubeData = useCallback(async (channel: string) => {
    try {
      setLoadingYoutube(true);
      const res = await fetch(`/api/fomo/youtube-posts?channel=${encodeURIComponent(channel)}`);
      if (res.ok) {
        const d = await res.json();
        setYoutubePosts(d.showcases || []);
      }
    } catch (e) {
      console.error("Error loading YouTube posts:", e);
    } finally {
      setLoadingYoutube(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // DISCOVER / SEARCH LOGIC
  // ─────────────────────────────────────────────────────────────────────────────
  const runDiscoverSearch = useCallback(async (pageNumber = 1) => {
    try {
      setDiscoverLoading(true);
      
      const facetsArray: string[][] = [
        [`project_type:${discoverType}`]
      ];

      // Version filter (only if not datapack)
      if (discoverType !== "datapack" && discoverVersion) {
        facetsArray.push([`versions:${discoverVersion}`]);
      }

      // Loader filter (only for mods and if not "any")
      if (discoverType === "mod" && discoverLoader !== "any") {
        facetsArray.push([`categories:${discoverLoader}`]);
      }

      const facets = JSON.stringify(facetsArray);
      const limit = 15;
      const offset = (pageNumber - 1) * limit;
      
      const url = `https://api.modrinth.com/v2/search` +
        `?facets=${encodeURIComponent(facets)}` +
        `&index=downloads` + // Sort by downloads to show popular things first
        (discoverQuery ? `&query=${encodeURIComponent(discoverQuery)}` : "") +
        `&limit=${limit}` +
        `&offset=${offset}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.hits ?? []).map((h: any) => ({
          projectId: h.project_id,
          title: h.title,
          description: h.description,
          iconUrl: h.icon_url,
          author: h.author,
          projectType: h.project_type || "mod",
          categories: h.categories || [],
          url: `https://modrinth.com/${h.project_type || "mod"}/${h.slug}`,
          downloads: h.downloads,
          _source: "modrinth"
        }));

        if (pageNumber === 1) {
          setDiscoverResults(mapped);
        } else {
          setDiscoverResults(prev => [...prev, ...mapped]);
        }
        setDiscoverTotal(data.total_hits || 0);
        setDiscoverPage(pageNumber);
      }
    } catch (e) {
      console.error("Discover search error:", e);
    } finally {
      setDiscoverLoading(false);
    }
  }, [discoverQuery, discoverType, discoverVersion, discoverLoader]);

  // Sync state between tabs
  useEffect(() => {
    if (activeTab === "spotlight") {
      loadSpotlightData();
      loadCollections();
    } else if (activeTab === "collections") {
      loadCollections();
    } else if (activeTab === "rankings") {
      loadRankingsData();
    } else if (activeTab === "feed") {
      loadYoutubeData(currentChannel);
    } else if (activeTab === "discover") {
      runDiscoverSearch(1);
    }
  }, [activeTab, currentChannel, loadSpotlightData, loadCollections, loadRankingsData, loadYoutubeData, runDiscoverSearch]);

  const handleOpenModDetails = async (mod: ModHit, isDependency = false) => {
    setSelectedMod(mod);
    setSelectedModDetails(null);
    setSelectedModDeps([]);
    setLoadingDetails(true);
    setModalTab("summary");

    let details = null;
    let depsData = [];

    try {
      // Try to fetch project details (contains gallery, game_versions, loaders)
      const pRes = await fetch(`https://api.modrinth.com/v2/project/${mod.projectId}`);
      if (pRes.ok) {
        details = await pRes.json();
        setSelectedModDetails(details);
      }

      // Try to fetch project dependencies
      const dRes = await fetch(`https://api.modrinth.com/v2/project/${mod.projectId}/dependencies`);
      if (dRes.ok) {
        const dJson = await dRes.json();
        depsData = dJson.projects || [];
        setSelectedModDeps(depsData);
      }
    } catch (e) {
      console.error("Failed to load mod detailed metadata:", e);
    } finally {
      const newStackItem = {
        mod,
        details,
        deps: depsData,
        tab: "summary" as const
      };

      if (isDependency) {
        const newStack = [...modStack.slice(0, activeStackIndex + 1), newStackItem];
        setModStack(newStack);
        setActiveStackIndex(newStack.length - 1);
      } else {
        setModStack([newStackItem]);
        setActiveStackIndex(0);
      }

      setLoadingDetails(false);
    }
  };

  const handleSwitchStackIndex = (index: number) => {
    if (index < 0 || index >= modStack.length) return;
    setActiveStackIndex(index);
    const item = modStack[index];
    setSelectedMod(item.mod);
    setSelectedModDetails(item.details);
    setSelectedModDeps(item.deps);
    setModalTab(item.tab);
  };

  const handleGoBackInStack = () => {
    if (activeStackIndex > 0) {
      handleSwitchStackIndex(activeStackIndex - 1);
    }
  };

  const handleCloseModDetails = () => {
    setSelectedMod(null);
    setSelectedModDetails(null);
    setSelectedModDeps([]);
    setModStack([]);
    setActiveStackIndex(-1);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden px-4 pt-6">
      
      {/* Header Bar */}
      <header className="flex justify-between items-center mb-6 px-1 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 shrink-0">
            <img
              src="/fomoico.png"
              alt="FOMO Logo"
              className="w-9 h-9 object-contain animate-fomo-blink"
            />
          </div>
          <div className="flex flex-col">
            <span
              className="text-[9px] font-mono uppercase tracking-widest font-bold"
              style={{ color: "var(--color-primary)" }}
            >MIM Hub</span>
            <h1
              className="text-sm font-bold tracking-tight leading-none font-headline"
              style={{ color: "var(--color-foreground)" }}
            >FOMO Cloud</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Pill — uses CSS vars */}
          <div
            className="relative flex items-center h-8 w-[92px] p-0.5 rounded-xl transition-all"
            style={{
              background: "color-mix(in srgb, var(--color-surface) 80%, transparent)",
              border: "1px solid var(--color-border-strong)",
            }}
          >
            {/* Sliding active indicator */}
            <div
              className="absolute transition-all duration-300 ease-out rounded-lg pointer-events-none"
              style={{
                width: "26px",
                height: "26px",
                transform: `translateX(${["official", "vampire", "modern"].indexOf(theme) * 28}px)`,
                background: "color-mix(in srgb, var(--color-primary) 20%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-primary) 35%, transparent)",
                left: "2px",
              }}
            />
            {[
              { id: "official", icon: <Coffee className="w-3.5 h-3.5" />, label: "Oficial" },
              { id: "vampire",  icon: <Ghost  className="w-3.5 h-3.5" />, label: "Vampire" },
              { id: "modern",   icon: <Sun    className="w-3.5 h-3.5" />, label: "Modern" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleThemeChange(opt.id as any)}
                title={opt.label}
                className="relative z-10 w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-300"
                style={{
                  color: theme === opt.id ? "var(--color-primary)" : "var(--color-muted)",
                }}
              >
                {opt.icon}
              </button>
            ))}
          </div>

          <button
            onClick={() => showAlert("MIM FOMO Web", "FOMO Cloud Sync Web App\nVersión 1.3.0\nDiseñado por la comunidad de MIM.")}
            className="rounded-full p-2 active:scale-95 transition-all"
            style={{
              background: "color-mix(in srgb, var(--color-surface) 80%, transparent)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-muted)",
            }}
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* MIM Logo on the far right */}
          <div className="relative w-8 h-8 shrink-0 ml-1">
            <img
              src="/icon.png"
              alt="MIM Logo"
              className="w-8 h-8 rounded-lg shadow-md animate-slime object-contain"
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        <AnimatePresence mode="wait">
        
        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 1: PROFILE / LOGIN
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-24 scrollbar-none"
          >
            {!session ? (
              <div className="my-auto bg-surface/80 border border-border rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto mb-3">
                    <User className="w-6 h-6 text-orange-500" />
                  </div>
                  <h2 className="text-md font-bold text-white">FOMO Cloud Sync</h2>
                  <p className="text-xs text-white/40 mt-1">Accedé a tus modpacks, ránkings y mods favoritos en cualquier dispositivo.</p>
                </div>

                <form onSubmit={handleAuth} className="flex flex-col gap-4">
                  {isRegistering && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase font-mono">Nombre de usuario</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Tu apodo"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-orange-500/50 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase font-mono">Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-orange-500/50 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase font-mono">Contraseña</label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-orange-500/50 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl py-3.5 mt-2 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {authLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isRegistering ? (
                      "Registrarme"
                    ) : (
                      "Iniciar Sesión"
                    )}
                  </button>
                </form>

                <div className="text-center">
                  <button
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-[11px] text-orange-400 font-semibold hover:underline"
                  >
                    {isRegistering ? "¿Ya tenés cuenta? Iniciá sesión" : "¿No tenés cuenta? Registrate gratis"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="bg-surface/90 border border-border rounded-3xl overflow-hidden flex flex-col relative shadow-xl">
                  {/* Banner */}
                  <div className="h-28 w-full relative overflow-hidden bg-gradient-to-r from-orange-600/30 to-rose-600/30 border-b border-white/[0.04]">
                    {profile?.banner_url ? (
                      <img src={profile.banner_url} alt="User Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div 
                        className="w-full h-full opacity-60 transition-all duration-300"
                        style={{
                          background: `linear-gradient(135deg, ${profile?.color || '#F05A28'}44 0%, var(--color-surface) 100%)`
                        }}
                      />
                    )}
                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="absolute top-3 right-3 bg-black/40 hover:bg-red-500/20 hover:text-red-400 border border-white/[0.08] backdrop-blur-md rounded-full p-2 text-white/70 active:scale-95 transition-all z-10"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Profile Info & Avatar */}
                  <div className="px-5 pb-5 pt-0 relative flex flex-col items-start">
                    {/* Avatar Container */}
                    <div 
                      className="w-16 h-16 rounded-2xl bg-surface border-2 border-border flex items-center justify-center text-rose-400 text-xl font-black uppercase overflow-hidden -mt-8 shadow-lg z-10"
                      style={{ borderColor: profile?.color || 'rgba(255,255,255,0.08)' }}
                    >
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="User Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span style={{ color: profile?.color || '#E11D48' }}>
                          {profile?.username?.substring(0, 2) || session.user.email.substring(0, 2)}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 w-full flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <span 
                          className="border text-[8px] font-bold font-mono px-2 py-0.5 rounded-full uppercase"
                          style={{
                            backgroundColor: `${profile?.color || '#F05A28'}15`,
                            borderColor: `${profile?.color || '#F05A28'}30`,
                            color: profile?.color || '#F05A28'
                          }}
                        >
                          FOMO Member
                        </span>
                        <h2 className="text-sm font-bold text-white truncate mt-2">@{profile?.username || "Usuario"}</h2>
                        <p className="text-[10px] text-white/40 truncate mt-0.5">{session.user.email}</p>
                      </div>
                      {/* Edit Profile Button */}
                      <button
                        onClick={handleOpenEditProfile}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold active:scale-95 transition-all"
                        style={{
                          background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
                          color: "var(--color-primary)",
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                        Editar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-white/70 tracking-wide flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-orange-500" /> Borradores Modpacks (Drafts)
                  </h3>
                  {loadingUserData ? (
                    <div className="py-6 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                    </div>
                  ) : userDrafts.length > 0 ? (
                    <div className="grid gap-3">
                      {userDrafts.map(draft => (
                        <div key={draft.id} className="bg-surface/80 border border-border rounded-2xl p-4 flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-bold text-white">{draft.name}</h4>
                            <p className="text-[10px] text-white/40 mt-1">Versión: {draft.minecraft_version} • Loader: {draft.loader}</p>
                          </div>
                          <span className="bg-white/5 border border-white/[0.08] text-white/60 text-[9px] px-2 py-0.5 rounded-full">
                            {draft.visibility}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
                      <p className="text-xs text-white/40">No tenés borradores colaborativos creados.</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-white/70 tracking-wide flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" /> Mis Mods Favoritos
                  </h3>
                  {loadingUserData ? (
                    <div className="py-6 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                    </div>
                  ) : userFavorites.length > 0 ? (
                    <div className="grid gap-3">
                      {userFavorites.map(fav => (
                        <div key={fav.id} className="bg-surface/80 border border-border rounded-2xl p-3.5 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {fav.icon_url ? (
                              <img src={fav.icon_url} alt="" className="object-cover w-full h-full" />
                            ) : (
                              <span className="text-white/40 text-xs font-bold uppercase">{fav.name.substring(0,2)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{fav.name}</h4>
                            <p className="text-[9px] text-white/35 mt-0.5 capitalize">{fav.platform}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
                      <p className="text-xs text-white/40">No guardaste ningún mod favorito todavía.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 2: SPOTLIGHT (Desktop Style Mods Carousel + Tickers)
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === "spotlight" && (
          <motion.div
            key="spotlight"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-24 scrollbar-none"
          >
            <div 
              className="border-l-2 rounded-r-lg p-3 mb-6 shrink-0"
              style={{
                background: "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)",
                borderColor: "var(--color-primary)"
              }}
            >
              <p className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: "var(--color-primary)" }}>Showcases Spotlight</p>
              <h2 className="text-xs font-semibold text-white/95 mt-1">Minecraft Mods e ideas editoriales en vivo.</h2>
            </div>

            {/* Desktop Style: Mods INSIDE the latest featured collection */}
            <div className="flex flex-col gap-3 mb-6 shrink-0">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-bold text-white/80 tracking-wide flex items-center gap-1.5">
                  {activeSpotlightPlatform === "modrinth" 
                    ? `Destacados: ${latestCollectionName || "Modrinth Featured"}`
                    : `Destacados: ${curseForgeFeatured[0]?.name || "CurseForge Community Picks"}`}
                </h3>
                
                {/* Toggle Button */}
                <button
                  onClick={() => setActiveSpotlightPlatform(activeSpotlightPlatform === "modrinth" ? "curseforge" : "modrinth")}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase bg-white/5 text-white/80 border border-white/10 shadow-sm backdrop-blur-md hover:bg-white/10 transition-colors"
                  style={{ color: "var(--color-foreground)", borderColor: "var(--color-border)" }}
                >
                  <span>{activeSpotlightPlatform === "modrinth" ? "Ver CurseForge" : "Ver Modrinth"}</span>
                  <ChevronRight className={`w-3 h-3 transform transition-transform ${activeSpotlightPlatform === "curseforge" ? "rotate-180" : ""}`} />
                </button>
              </div>

              {loadingLatestMods ? (
                <div className="h-40 bg-white/[0.02] rounded-2xl border border-white/[0.04] flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
                </div>
              ) : (
                <div className="w-full">
                  {activeSpotlightPlatform === "modrinth" ? (
                    <HorizontalEditorialMarquee 
                      items={latestFeaturedMods}
                      type="mod"
                      onSelectMod={handleOpenModDetails}
                      speed={0.6}
                      reverse={false}
                    />
                  ) : (
                    <HorizontalEditorialMarquee 
                      items={curseForgeFeatured}
                      type="collection"
                      onSelectCollection={handleEnterCollection}
                      speed={0.5}
                      reverse={false}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Row 3: Multi-channel Showcase */}
            <div className="flex flex-col gap-3 mb-6 shrink-0">
              <div className="px-1 flex items-center justify-between">
                <span 
                  className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border shadow-sm backdrop-blur-md"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                    color: "var(--color-primary)",
                    borderColor: "color-mix(in srgb, var(--color-primary) 25%, transparent)"
                  }}
                >
                  Showcase · {showcaseChannels.length} canal{showcaseChannels.length !== 1 ? "es" : ""}
                </span>
                <button
                  onClick={() => setShowChannelPicker(true)}
                  className="p-1.5 rounded-xl hover:bg-white/5 active:scale-95 text-white/35 hover:text-white/80 transition-all"
                  title="Configurar canales"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <HorizontalShowcaseMarquee channels={showcaseChannels} speed={0.5} reverse={true} />
            </div>

            {/* Vertical Tickers side-by-side (300px bound) */}
            <div className="flex gap-4 h-[300px] min-h-[300px] mb-4">
              <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-[11px] font-bold text-white/80 tracking-wide mb-3 flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> Actualizados
                </h3>
                <div className="flex-1 relative bg-white/[0.01] rounded-xl border border-white/[0.03]">
                  <VerticalTicker 
                    mods={updatedMods} 
                    onSelectMod={handleOpenModDetails}
                    speed={0.4}
                    color="text-blue-400"
                    reverse={true}
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-[11px] font-bold text-white/80 tracking-wide mb-3 flex items-center gap-1.5 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" /> Creados
                </h3>
                <div className="flex-1 relative bg-white/[0.01] rounded-xl border border-white/[0.03]">
                  <VerticalTicker 
                    mods={newestMods} 
                    onSelectMod={handleOpenModDetails}
                    speed={0.5}
                    color="text-purple-400"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 3: COLLECTIONS (CurseForge Picks, Modrinth Official, Personal Drafts)
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === "collections" && (
          <motion.div
            key="collections"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-1 flex flex-col min-h-0 relative"
          >
            <AnimatePresence mode="wait">
              {!activeCollection ? (
                // Colecciones List View
                <motion.div 
                  key="list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-24 scrollbar-none"
                >
                  <div 
                    className="border-l-2 rounded-r-lg p-3 mb-6 shrink-0"
                    style={{
                      background: "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)",
                      borderColor: "var(--color-primary)"
                    }}
                  >
                    <p className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: "var(--color-primary)" }}>Colecciones</p>
                    <h2 className="text-xs font-semibold text-white/95 mt-1">Colecciones editoriales y modpacks colaborativos.</h2>
                  </div>

                  {/* Modrinth Official Collections Slider */}
                  {modrinthFeatured.length > 0 && (
                    <div className="flex flex-col gap-3 mb-6 shrink-0">
                      <h3 className="text-xs font-bold text-white/80 tracking-wide px-1 flex items-center gap-1.5">
                        Colecciones Oficiales de Modrinth
                      </h3>
                      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                        {modrinthFeatured.map(coll => (
                          <div 
                            key={coll.id}
                            onClick={() => handleEnterCollection(coll)}
                            className="bg-[#151518]/95 border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3 min-w-[260px] max-w-[260px] snap-center hover:border-white/10 active:scale-[0.98] transition-all cursor-pointer"
                          >
                            <div className="h-28 rounded-xl bg-white/5 border border-white/[0.05] overflow-hidden relative flex items-center justify-center">
                              {coll.iconUrl ? (
                                <img src={coll.iconUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Compass className="w-12 h-12 text-white/20" />
                              )}
                              <span className="absolute bottom-2.5 right-2.5 bg-black/60 border border-white/[0.05] rounded-md px-2 py-0.5 text-[9px] font-mono text-white/70">
                                {coll.projectCount} mods
                              </span>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white truncate">{coll.name}</h4>
                              <p className="text-[10px] text-white/40 mt-1 leading-relaxed line-clamp-2">{coll.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CurseForge Picks */}
                  {curseForgeFeatured.length > 0 && (
                    <div className="flex flex-col gap-3 mb-6 shrink-0">
                      <h3 className="text-xs font-bold text-white/80 tracking-wide px-1 flex items-center gap-1.5">
                        CurseForge Picks
                      </h3>
                      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                        {curseForgeFeatured.map(pick => (
                          <div 
                            key={pick.id}
                            onClick={() => handleEnterCollection(pick)}
                            className="bg-[#151518]/95 border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3 min-w-[260px] max-w-[260px] snap-center hover:border-white/10 active:scale-[0.98] transition-all cursor-pointer"
                          >
                            <div className="h-28 rounded-xl bg-white/5 border border-white/[0.05] overflow-hidden relative">
                              <img src={pick.iconUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white truncate">{pick.name}</h4>
                              <p className="text-[10px] text-white/40 mt-1 leading-relaxed line-clamp-2">{pick.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personal/Supabase user packs (Drafts) */}
                  <div className="flex flex-col gap-3 mb-6 shrink-0">
                    <h3 className="text-xs font-bold text-white/80 tracking-wide px-1 flex items-center gap-1.5">
                      Tus Modpacks Colaborativos (Supabase)
                    </h3>
                    {session ? (
                      userDrafts.length > 0 ? (
                        <div className="grid gap-3 px-1">
                          {userDrafts.map(draft => (
                            <div 
                              key={draft.id}
                              onClick={() => handleEnterCollection({
                                id: draft.id,
                                name: draft.name,
                                description: draft.description || "Modpack colaborativo",
                                projectCount: 0,
                                source: "modrinth"
                              })}
                              className="bg-[#151518]/80 border border-white/[0.05] rounded-2xl p-4 flex justify-between items-center active:scale-[0.98] transition-all cursor-pointer hover:border-white/10"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                  <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-white">{draft.name}</h4>
                                  <p className="text-[10px] text-white/45 mt-0.5">Versión: {draft.minecraft_version} • Loader: {draft.loader}</p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-white/30" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-white/[0.01] border border-dashed border-white/[0.06] rounded-2xl p-6 text-center text-xs text-white/40">
                          No tienes modpacks creados.
                        </div>
                      )
                    ) : (
                      <div className="bg-surface/60 border border-border rounded-2xl p-6 text-center">
                        <p className="text-xs text-white/40">Iniciá sesión en la pestaña Perfil para sincronizar y ver tus modpacks.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                // entered / opened collection details subview
                <motion.div 
                  key="detail"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  {/* Sub Header / back trigger */}
                  <div className="flex items-center gap-3 mb-5 shrink-0">
                    <button 
                      onClick={handleExitCollection}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-xl text-white/70 active:scale-95 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400 font-bold">Colección abierta</span>
                      <h2 className="text-xs font-bold text-white truncate leading-tight mt-0.5">{activeCollection.name}</h2>
                    </div>
                  </div>

                  {/* List of Mods inside the collection */}
                  {loadingActiveMods ? (
                    <div className="flex-1 flex flex-col justify-center items-center">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                      <span className="text-xs text-white/40 mt-3 font-mono">Leyendo mods de la colección...</span>
                    </div>
                  ) : activeCollectionMods.length > 0 ? (
                    <div className="flex-1 overflow-y-auto space-y-3 pb-24 pr-1 scrollbar-none">
                      <p className="text-[10px] text-white/40 italic px-1 mb-2">{activeCollection.description}</p>
                      {activeCollectionMods.map(mod => (
                        <div 
                          key={mod.projectId} 
                          onClick={() => handleOpenModDetails(mod)}
                          className="bg-surface/90 border border-border rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-border"
                        >
                          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {mod.iconUrl ? (
                              <img src={mod.iconUrl} alt="" className="object-cover w-full h-full" />
                            ) : (
                              <span className="text-white/40 text-xs font-bold uppercase">{mod.title.substring(0,2)}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{mod.title}</p>
                            <p className="text-[9px] text-white/40 mt-0.5 capitalize">{mod.author || "Comunidad"}</p>
                          </div>
                          
                          <ChevronRight className="w-4 h-4 text-white/30" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
                      <Compass className="w-12 h-12 text-emerald-400 mb-4 opacity-50" />
                      <h2 className="text-sm font-semibold text-white">Sin mods</h2>
                      <p className="text-xs text-white/40 mt-1">Esta colección no tiene proyectos asociados.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 4: CANALES DE YOUTUBE FEED
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === "feed" && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Dynamic channel header / manage toggle */}
            <div className="flex justify-between items-center mb-3 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Canales Seguidos</span>
              <button
                onClick={() => setShowChannelManager(!showChannelManager)}
                className="text-[10.5px] font-bold text-orange-500 hover:text-orange-400 flex items-center gap-1.5 transition-colors"
              >
                {showChannelManager ? "Ocultar Ajustes" : "Administrar Canales"}
              </button>
            </div>

            {showChannelManager && (
              <div className="bg-white/5 border border-white/[0.06] rounded-2xl p-3.5 mb-4 flex flex-col gap-3 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChannelInput}
                    onChange={(e) => setNewChannelInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddChannel()}
                    placeholder="User o URL (ej. @ElRichMC)"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-orange-500/50"
                  />
                  <button
                    onClick={handleAddChannel}
                    className="px-3.5 py-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 text-xs font-bold transition-all"
                  >
                    Agregar
                  </button>
                </div>
                
                {/* List of followed channels to remove */}
                <div className="max-h-28 overflow-y-auto space-y-1.5 scrollbar-none pr-1">
                  {followedChannels.map((chan) => (
                    <div key={chan.url} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-1.5">
                      <span className="text-[11px] font-semibold text-white/70 truncate">{chan.name}</span>
                      <button
                        onClick={() => handleRemoveChannel(chan.url)}
                        className="p-1 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all active:scale-95"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Channels horizontal filter */}
            <div className="flex gap-2 mb-4 shrink-0 overflow-x-auto pb-1 scrollbar-none">
              {followedChannels.map(chan => (
                <button
                  key={chan.url}
                  onClick={() => setCurrentChannel(chan.url)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    currentChannel === chan.url 
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" 
                      : "bg-white/5 text-white/50 border border-white/[0.05]"
                  }`}
                >
                  {chan.name}
                </button>
              ))}
            </div>

            {loadingYoutube ? (
              <div className="flex-1 flex flex-col justify-center items-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <span className="text-xs text-white/40 mt-3 font-mono">Conectando con YouTube...</span>
              </div>
            ) : youtubePosts.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-4 pb-28 pr-1 scrollbar-none">
                {youtubePosts.map((post) => (
                  <div key={post.postId} className="bg-surface/90 border border-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                    <p className="text-xs text-white/95 leading-relaxed whitespace-pre-wrap">{post.description}</p>
                    
                    {post.thumbnail && (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-white/5 border border-white/[0.05]">
                        <img src={post.thumbnail} alt="" className="object-cover w-full h-full" />
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-white/[0.04] mt-1">
                      <span className="text-[10px] text-white/40 font-mono">{post.publishedAt}</span>
                      <a
                        href={post.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-blue-400 hover:underline flex items-center gap-1"
                      >
                        Abrir YouTube <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
                <Film className="w-12 h-12 text-blue-400 mb-4 opacity-50" />
                <h2 className="text-sm font-semibold text-white">Sin publicaciones</h2>
                <p className="text-xs text-white/40 mt-1">No se encontraron posteos de mods recientes en este canal.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 5: COMMUNITY RANKINGS (Supabase)
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === "rankings" && (
          <motion.div
            key="rankings"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div 
              className="border-l-2 rounded-r-lg p-3 mb-6 shrink-0"
              style={{
                background: "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)",
                borderColor: "var(--color-primary)"
              }}
            >
              <p className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: "var(--color-primary)" }}>Ránkings</p>
              <h2 className="text-xs font-semibold text-white/90 mt-1">Mods más votados por la comunidad de MIM en la nube.</h2>
            </div>

            {loadingRankings ? (
              <div className="flex-1 flex flex-col justify-center items-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <span className="text-xs text-white/40 mt-3 font-mono">Leyendo Supabase Cloud...</span>
              </div>
            ) : rankings.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-3 pb-28 pr-1 scrollbar-none">
                {rankings.map((mod, i) => (
                  <div 
                    key={mod.projectId} 
                    onClick={() => handleOpenModDetails(mod)}
                    className="bg-surface/90 border border-border rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-border"
                  >
                    <div className="w-6 text-center font-mono font-black text-sm text-purple-400/80">
                      #{i + 1}
                    </div>

                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {mod.iconUrl ? (
                        <img src={mod.iconUrl} alt="" className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-white/40 text-xs font-bold uppercase">{mod.title.substring(0,2)}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{mod.title}</p>
                      <p className="text-[9px] text-white/40 mt-0.5 capitalize">{mod._source}</p>
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px] px-2 py-0.5 rounded-full">
                      {mod.downloads} {mod.downloads === 1 ? "voto" : "votos"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
                <Compass className="w-12 h-12 text-purple-400 mb-4 opacity-50" />
                <h2 className="text-sm font-semibold text-white">Sin rankings</h2>
                <p className="text-xs text-white/40 mt-1">No hay votos registrados en Supabase todavía.</p>
              </div>
            )}
          </motion.div>
        )}
        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 6: DISCOVER / BUSCADOR
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === "discover" && (
          <motion.div
            key="discover"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-1 flex flex-col min-h-0 pb-24"
          >
            {/* Header / Intro */}
            <div 
              className="border-l-2 rounded-r-lg p-3 mb-4 shrink-0"
              style={{
                background: "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)",
                borderColor: "var(--color-primary)"
              }}
            >
              <p className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: "var(--color-primary)" }}>Explorar</p>
              <h2 className="text-xs font-semibold text-white/90 mt-1">Explorá y buscá mods, texturas y shaders de Modrinth.</h2>
            </div>

            {/* Type selector tabs */}
            <div className="flex gap-1.5 mb-3 shrink-0 overflow-x-auto pb-1 scrollbar-none">
              {[
                { value: "mod", label: "Mods" },
                { value: "resourcepack", label: "Texturas" },
                { value: "shader", label: "Shaders" },
                { value: "datapack", label: "Datapacks" }
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => {
                    setDiscoverType(type.value);
                    setDiscoverResults([]);
                    setDiscoverPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                    discoverType === type.value 
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/35 shadow-sm" 
                      : "bg-white/5 text-white/50 border border-white/[0.04] hover:bg-white/10"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* Filters Bar: Version & Loader */}
            <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
              {/* Version filter dropdown */}
              {discoverType !== "datapack" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider">Versión de Minecraft</label>
                  <select
                    value={discoverVersion}
                    onChange={(e) => {
                      setDiscoverVersion(e.target.value);
                      setDiscoverResults([]);
                      setDiscoverPage(1);
                    }}
                    className="w-full bg-surface/90 border border-border rounded-xl py-2 px-3 text-xs text-white/80 focus:border-amber-500/50 outline-none cursor-pointer"
                  >
                    {["1.21.1", "1.20.4", "1.20.1", "1.19.4", "1.19.2", "1.18.2", "1.16.5", "1.12.2"].map(ver => (
                      <option key={ver} value={ver} className="bg-surface text-white">{ver}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Loader filter dropdown (only for Mods) */}
              {discoverType === "mod" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider">Mod Loader</label>
                  <select
                    value={discoverLoader}
                    onChange={(e) => {
                      setDiscoverLoader(e.target.value);
                      setDiscoverResults([]);
                      setDiscoverPage(1);
                    }}
                    className="w-full bg-surface/90 border border-border rounded-xl py-2 px-3 text-xs text-white/80 focus:border-amber-500/50 outline-none cursor-pointer"
                  >
                    {[
                      { value: "fabric", label: "Fabric" },
                      { value: "forge", label: "Forge" },
                      { value: "neoforge", label: "NeoForge" },
                      { value: "quilt", label: "Quilt" },
                      { value: "any", label: "Cualquiera" }
                    ].map(loader => (
                      <option key={loader.value} value={loader.value} className="bg-surface text-white">{loader.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Search Bar Input */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                runDiscoverSearch(1);
              }}
              className="flex gap-2 mb-4 shrink-0"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar proyectos..."
                  value={discoverQuery}
                  onChange={(e) => setDiscoverQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-amber-500/55 outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-4 rounded-xl active:scale-95 transition-all shadow-md"
              >
                Buscar
              </button>
            </form>

            {/* Results list */}
            {discoverLoading && discoverPage === 1 ? (
              <div className="flex-1 flex flex-col justify-center items-center">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <span className="text-xs text-white/40 mt-3 font-mono">Buscando en Modrinth...</span>
              </div>
            ) : discoverResults.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-none">
                {discoverResults.map((mod) => (
                  <div 
                    key={mod.projectId} 
                    onClick={() => handleOpenModDetails(mod)}
                    className="bg-surface/90 border border-border rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-border"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {mod.iconUrl ? (
                        <img src={mod.iconUrl} alt="" className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-white/40 text-xs font-bold uppercase">{mod.title.substring(0, 2)}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{mod.title}</p>
                      <p className="text-[9px] text-white/40 mt-0.5 truncate leading-tight">{mod.description || `Creador: ${mod.author}`}</p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {mod.downloads !== undefined && (
                        <span className="text-[9.5px] font-mono text-white/30">
                          {mod.downloads >= 1_000_000 
                            ? `${(mod.downloads / 1_000_000).toFixed(1)}M` 
                            : mod.downloads >= 1_000 
                            ? `${Math.round(mod.downloads / 1_000)}K` 
                            : mod.downloads} ↓
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                    </div>
                  </div>
                ))}

                {/* Load More Button */}
                {discoverResults.length < discoverTotal && (
                  <button
                    onClick={() => runDiscoverSearch(discoverPage + 1)}
                    disabled={discoverLoading}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/[0.06] rounded-xl py-3 text-xs font-semibold text-white/70 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {discoverLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    ) : (
                      "Cargar más"
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
                <Search className="w-12 h-12 text-amber-500/50 mb-4 animate-pulse" />
                <h2 className="text-sm font-semibold text-white">Sin resultados</h2>
                <p className="text-xs text-white/40 mt-1">No se encontraron mods que coincidan con la búsqueda o filtros aplicados.</p>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Mod Details Sheet / Modal */}
      <AnimatePresence>
        {selectedMod && (
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end justify-center z-50 animate-fade-in" 
            onClick={handleCloseModDetails}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="bg-surface border-t border-border rounded-t-3xl w-full max-w-md p-6 pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] flex flex-col gap-5 relative max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 rounded-full bg-white/10 mx-auto -mt-2 mb-2" />

              {/* Stack / Solapas header */}
              {modStack.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none border-b border-white/[0.06] shrink-0">
                  <button 
                    onClick={handleGoBackInStack}
                    className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-xl text-white/70 active:scale-95 transition-all flex items-center justify-center shrink-0"
                    title="Volver"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {modStack.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSwitchStackIndex(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap border ${
                          activeStackIndex === idx
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                            : "bg-white/5 text-white/50 hover:text-white/80 border-transparent"
                        }`}
                      >
                        {item.mod.title.length > 15 ? `${item.mod.title.slice(0, 12)}...` : item.mod.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedMod.iconUrl ? (
                    <img src={selectedMod.iconUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white/40 font-bold uppercase">{selectedMod.title.substring(0, 2)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-orange-400 font-semibold">MIM Mod Details</span>
                  <h3 className="text-sm font-bold text-white mt-0.5 pr-6 leading-tight">{selectedMod.title}</h3>
                  <p className="text-[10px] text-white/40 mt-1">Autor: <span className="text-white/60">{selectedMod.author || "Comunidad"}</span></p>
                </div>
                <button 
                  onClick={handleCloseModDetails}
                  className="bg-white/5 hover:bg-white/10 rounded-full p-1.5 self-start text-white/60 active:scale-95 absolute right-5 top-5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex gap-1 border-b border-white/[0.06] pb-1 shrink-0 overflow-x-auto scrollbar-none">
                {[
                  { id: "summary", label: "Resumen" },
                  { id: "desc", label: "Descripción" },
                  { id: "versions", label: "Versiones" },
                  { id: "deps", label: "Dependencias" }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setModalTab(t.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                      modalTab === t.id
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Scrollable container for details */}
              <div className="overflow-y-auto max-h-[45vh] pr-1 flex-1 scrollbar-none relative min-h-0">
                <AnimatePresence mode="wait">
                  {modalTab === "summary" && (
                    <motion.div
                      key="summary"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex gap-3 text-[10px] border-b border-white/[0.04] pb-3 flex-wrap">
                        <div className="flex-1 min-w-[70px]">
                          <span className="text-white/30 block uppercase font-mono tracking-wider">Origen</span>
                          <span className="text-white/70 font-semibold mt-0.5 block capitalize">{selectedMod._source || "Modrinth"}</span>
                        </div>
                        {selectedMod.categories && selectedMod.categories.length > 0 && (
                          <div className="flex-1 min-w-[120px]">
                            <span className="text-white/30 block uppercase font-mono tracking-wider">Etiquetas</span>
                            <span className="text-white/70 font-semibold mt-0.5 block truncate capitalize">
                              {selectedMod.categories.join(", ")}
                            </span>
                          </div>
                        )}
                        {selectedMod.downloads !== undefined && (
                          <div className="min-w-[50px]">
                            <span className="text-white/30 block uppercase font-mono tracking-wider">Votos / DLs</span>
                            <span className="text-orange-400 font-bold mt-0.5 block font-mono">
                              {selectedMod.downloads >= 1_000_000 
                                ? `${(selectedMod.downloads / 1_000_000).toFixed(1)}M` 
                                : selectedMod.downloads >= 1_000 
                                ? `${Math.round(selectedMod.downloads / 1_000)}K` 
                                : selectedMod.downloads}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                        <p className="text-xs text-white/75 leading-relaxed">
                          {selectedMod.description || "Este mod expande las opciones de automatización, optimiza de forma ligera el juego y es totalmente compatible con la versión activa."}
                        </p>
                      </div>

                      {/* Compatibility Side Details */}
                      <div className="grid grid-cols-2 gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 text-[11px] text-white/70">
                        <div>
                          <span className="text-[9px] text-white/30 uppercase font-mono block">Lado Cliente</span>
                          <span className="font-semibold block capitalize mt-0.5">{selectedModDetails?.client_side || "Desconocido"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-white/30 uppercase font-mono block">Lado Servidor</span>
                          <span className="font-semibold block capitalize mt-0.5">{selectedModDetails?.server_side || "Desconocido"}</span>
                        </div>
                        {selectedModDetails?.license && (
                          <div className="col-span-2">
                            <span className="text-[9px] text-white/30 uppercase font-mono block">Licencia</span>
                            <span className="font-semibold block mt-0.5">{selectedModDetails.license.name || selectedModDetails.license.id}</span>
                          </div>
                        )}
                      </div>

                      {/* External links */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedModDetails?.wiki_url && (
                          <a href={selectedModDetails.wiki_url} target="_blank" rel="noopener noreferrer" className="bg-white/5 hover:bg-white/10 border border-white/[0.06] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white/80 flex items-center gap-1.5 transition-all">
                            <ExternalLink className="w-3 h-3" /> Wiki
                          </a>
                        )}
                        {selectedModDetails?.source_url && (
                          <a href={selectedModDetails.source_url} target="_blank" rel="noopener noreferrer" className="bg-white/5 hover:bg-white/10 border border-white/[0.06] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white/80 flex items-center gap-1.5 transition-all">
                            <ExternalLink className="w-3 h-3" /> Código Fuente
                          </a>
                        )}
                        {selectedModDetails?.issues_url && (
                          <a href={selectedModDetails.issues_url} target="_blank" rel="noopener noreferrer" className="bg-white/5 hover:bg-white/10 border border-white/[0.06] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white/80 flex items-center gap-1.5 transition-all">
                            <ExternalLink className="w-3 h-3" /> Reportes
                          </a>
                        )}
                        {selectedModDetails?.discord_url && (
                          <a href={selectedModDetails.discord_url} target="_blank" rel="noopener noreferrer" className="bg-white/5 hover:bg-white/10 border border-white/[0.06] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white/80 flex items-center gap-1.5 transition-all">
                            <ExternalLink className="w-3 h-3" /> Discord
                          </a>
                        )}
                      </div>

                      {/* Gallery / Capturas */}
                      {selectedModDetails?.gallery && selectedModDetails.gallery.length > 0 && (
                        <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-3">
                          <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block">Galería</span>
                          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x">
                            {selectedModDetails.gallery.map((img: any, i: number) => (
                              <div key={i} className="relative aspect-video h-20 rounded-xl overflow-hidden bg-white/5 border border-white/[0.05] flex-shrink-0 snap-center">
                                <img src={img.url} alt={img.title || "Screenshot"} className="object-cover w-full h-full" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {modalTab === "desc" && (
                    <motion.div
                      key="desc"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-4 min-h-[200px]"
                    >
                      {renderBodyText(selectedModDetails?.body || selectedMod.description)}
                    </motion.div>
                  )}

                  {modalTab === "versions" && (
                    <motion.div
                      key="versions"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col gap-2.5"
                    >
                      {loadingDetails ? (
                        <div className="flex flex-col items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                          <span className="text-[10px] text-white/40 mt-2 font-mono">Buscando versiones...</span>
                        </div>
                      ) : selectedModDetails?.game_versions && selectedModDetails.game_versions.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block font-semibold">Versiones de Minecraft Compatibles</span>
                          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-none">
                            {selectedModDetails.game_versions.map((ver: string) => (
                              <span key={ver} className="bg-white/5 border border-white/[0.08] text-white/70 text-[9px] px-2.5 py-0.5 rounded-full font-mono">
                                {ver}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-white/40 italic">No se listaron versiones compatibles.</p>
                      )}
                    </motion.div>
                  )}

                  {modalTab === "deps" && (
                    <motion.div
                      key="deps"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col gap-2.5"
                    >
                      {loadingDetails ? (
                        <div className="flex flex-col items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                          <span className="text-[10px] text-white/40 mt-2 font-mono">Buscando dependencias...</span>
                        </div>
                      ) : selectedModDeps && selectedModDeps.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block font-semibold">Dependencias ({selectedModDeps.length})</span>
                          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-none">
                            {selectedModDeps.map((dep: any) => (
                              <div 
                                key={dep.id} 
                                onClick={() => {
                                  handleOpenModDetails({
                                    projectId: dep.id,
                                    title: dep.title,
                                    description: dep.description || "",
                                    iconUrl: dep.icon_url,
                                    author: dep.author || "Comunidad",
                                    projectType: dep.project_type || "mod",
                                    categories: dep.categories || [],
                                    url: `https://modrinth.com/${dep.project_type || "mod"}/${dep.slug}`,
                                    _source: "modrinth"
                                  }, true);
                                }}
                                className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] rounded-xl p-2 flex items-center gap-3 transition-colors cursor-pointer"
                              >
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {dep.icon_url ? (
                                    <img src={dep.icon_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-white/40 text-xs font-bold uppercase">{dep.title.substring(0, 2)}</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-bold text-white truncate block">{dep.title}</span>
                                  <span className="text-[9px] text-white/45 block capitalize">{dep.project_type || "mod"}</span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-white/40 italic">Este proyecto no requiere ninguna dependencia.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-white/[0.04] shrink-0">
                <button
                  onClick={() => {
                    if (modalTab === "summary") {
                      setModalTab("desc");
                    } else {
                      setModalTab("summary");
                    }
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {modalTab === "summary" ? (
                    <>
                      <Layers className="w-4 h-4" /> Ver Detalles Completos
                    </>
                  ) : (
                    <>
                      <ArrowLeft className="w-4 h-4" /> Volver al Resumen
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Alert Overlay */}
      {customAlert && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setCustomAlert(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-2xl flex flex-col gap-4 animate-scale-in">
            <h3 className="text-base font-bold text-white tracking-tight">{customAlert.title}</h3>
            <p className="text-xs text-white/60 whitespace-pre-line leading-relaxed">{customAlert.message}</p>
            <button
              onClick={() => setCustomAlert(null)}
              className="mt-2 w-full bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs rounded-xl py-3 transition-all active:scale-[0.98]"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* ─── Edit Profile Modal ─────────────────────────────────────────────── */}
      {showEditProfile && session && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center p-4 sm:items-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowEditProfile(false)}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-3xl border shadow-2xl flex flex-col gap-0 animate-scale-in overflow-hidden"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
                  Editar Perfil
                </h3>
              </div>
              <button
                onClick={() => setShowEditProfile(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: "var(--color-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 p-5">
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase font-mono tracking-widest" style={{ color: "var(--color-muted)" }}>
                  Nombre de usuario
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted)" }} />
                  <input
                    type="text"
                    placeholder="Tu nombre visible"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full rounded-xl py-3 pl-10 pr-4 text-xs outline-none transition-all"
                    style={{
                      background: "color-mix(in srgb, var(--color-surface) 60%, var(--color-card))",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-foreground)",
                    }}
                  />
                </div>
              </div>

              {/* Avatar Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase font-mono tracking-widest" style={{ color: "var(--color-muted)" }}>
                  Avatar (Seleccionar imagen)
                </label>
                <div className="flex gap-3 items-center">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 border bg-black/20" style={{ borderColor: "var(--color-border)" }}>
                    {editAvatarUrl ? (
                      <img src={editAvatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6" style={{ color: "var(--color-muted)" }} />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex gap-2">
                      <label
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                        style={{ background: "color-mix(in srgb, var(--color-primary) 15%, transparent)", color: "var(--color-primary)" }}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Elegir foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await resizeAndCompressImage(file, 160, 160);
                                setEditAvatarUrl(compressed);
                              } catch (err) {
                                console.error(err);
                              }
                            }
                          }}
                        />
                      </label>
                      {editAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setEditAvatarUrl("")}
                          className="px-3 py-2 rounded-xl text-xs font-semibold hover:bg-red-500/10 text-red-500 border border-red-500/20 active:scale-95 transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      )}
                    </div>
                    <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                      JPG, PNG o WEBP. Redimensionado automáticamente.
                    </span>
                  </div>
                </div>
              </div>

              {/* Banner Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase font-mono tracking-widest" style={{ color: "var(--color-muted)" }}>
                  Banner (Seleccionar imagen)
                </label>
                <div className="flex flex-col gap-2">
                  <div className="relative w-full h-24 rounded-2xl overflow-hidden flex items-center justify-center border bg-black/20" style={{ borderColor: "var(--color-border)" }}>
                    {editBannerUrl ? (
                      <img src={editBannerUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] uppercase font-mono tracking-wider" style={{ color: "var(--color-muted)" }}>Sin Banner</span>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <label
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                      style={{ background: "color-mix(in srgb, var(--color-primary) 15%, transparent)", color: "var(--color-primary)" }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Elegir banner
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressed = await resizeAndCompressImage(file, 800, 300);
                              setEditBannerUrl(compressed);
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                      />
                    </label>
                    {editBannerUrl && (
                      <button
                        type="button"
                        onClick={() => setEditBannerUrl("")}
                        className="px-3 py-2 rounded-xl text-xs font-semibold hover:bg-red-500/10 text-red-500 border border-red-500/20 active:scale-95 transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Color */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase font-mono tracking-widest" style={{ color: "var(--color-muted)" }}>
                  Color de perfil
                </label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl border shrink-0"
                    style={{ background: editColor, borderColor: "var(--color-border)" }}
                  />
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-full h-9 rounded-xl border cursor-pointer"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
                  />
                  {/* Quick color presets */}
                  <div className="flex gap-1.5 shrink-0">
                    {["#F05A28", "#E11D48", "#7C3AED", "#0EA5E9", "#10B981"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className="w-5 h-5 rounded-full border-2 transition-all active:scale-95"
                        style={{
                          background: c,
                          borderColor: editColor === c ? "white" : "transparent",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Status feedback */}
              {editProfileStatus && (
                <div
                  className="text-xs rounded-xl px-4 py-2.5 text-center font-semibold"
                  style={{
                    background: editProfileStatus.ok
                      ? "color-mix(in srgb, #10B981 12%, transparent)"
                      : "color-mix(in srgb, #EF4444 12%, transparent)",
                    color: editProfileStatus.ok ? "#10B981" : "#EF4444",
                    border: `1px solid ${editProfileStatus.ok ? "#10B98130" : "#EF444430"}`,
                  }}
                >
                  {editProfileStatus.msg}
                </div>
              )}

              {/* Save Button */}
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full text-white font-semibold text-xs rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                style={{ background: "var(--color-primary)" }}
              >
                {savingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Guardar cambios
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Channel Picker Modal ─────────────────────────────────────────── */}
      {showChannelPicker && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center p-4 sm:items-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowChannelPicker(false)}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-3xl border shadow-2xl flex flex-col gap-0 animate-scale-in overflow-hidden"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
                  Canales del Showcase
                </h3>
              </div>
              <button
                onClick={() => setShowChannelPicker(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: "var(--color-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col gap-4 p-5 max-h-[60vh] overflow-y-auto scrollbar-thin">
              {/* Suggested Channels List */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase font-mono tracking-widest mb-1" style={{ color: "var(--color-muted)" }}>
                  Canales sugeridos
                </span>
                {[
                  "https://www.youtube.com/@EnderVerseMC",
                  "https://www.youtube.com/@KreksuMinecraft",
                  "https://www.youtube.com/@NoxusMods",
                  "https://www.youtube.com/@sir_color",
                  "https://www.youtube.com/@Wero_lovernite",
                ].map((ch) => {
                  const active = showcaseChannels.includes(ch);
                  const handle = ch.includes("@") ? "@" + ch.split("@")[1] : ch.split("/").pop();
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => {
                        if (active) {
                          handleSaveShowcaseChannels(showcaseChannels.filter((c) => c !== ch));
                        } else {
                          handleSaveShowcaseChannels([...showcaseChannels, ch]);
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left"
                      style={{
                        background: active
                          ? "color-mix(in srgb, var(--color-primary) 10%, transparent)"
                          : "color-mix(in srgb, var(--color-surface) 60%, var(--color-card))",
                        borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                        color: active ? "var(--color-primary)" : "var(--color-foreground)",
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-md border flex items-center justify-center shrink-0"
                        style={{
                          borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                          background: active ? "var(--color-primary)" : "transparent",
                        }}
                      >
                        {active && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="truncate">{handle}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom channels list */}
              {showcaseChannels.filter(
                (c) =>
                  ![
                    "https://www.youtube.com/@EnderVerseMC",
                    "https://www.youtube.com/@KreksuMinecraft",
                    "https://www.youtube.com/@NoxusMods",
                    "https://www.youtube.com/@sir_color",
                    "https://www.youtube.com/@Wero_lovernite",
                  ].includes(c)
              ).length > 0 && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <span className="text-[10px] font-bold uppercase font-mono tracking-widest mb-1" style={{ color: "var(--color-muted)" }}>
                    Canales agregados
                  </span>
                  {showcaseChannels
                    .filter(
                      (c) =>
                        ![
                          "https://www.youtube.com/@EnderVerseMC",
                          "https://www.youtube.com/@KreksuMinecraft",
                          "https://www.youtube.com/@NoxusMods",
                          "https://www.youtube.com/@sir_color",
                          "https://www.youtube.com/@Wero_lovernite",
                        ].includes(c)
                    )
                    .map((ch) => {
                      const handle = ch.includes("@") ? "@" + ch.split("@")[1] : ch.split("/").pop();
                      return (
                        <div
                          key={ch}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border"
                          style={{
                            background: "color-mix(in srgb, var(--color-surface) 60%, var(--color-card))",
                            borderColor: "var(--color-border)",
                            color: "var(--color-foreground)",
                          }}
                        >
                          <span className="truncate flex-1">{handle}</span>
                          <button
                            type="button"
                            onClick={() => {
                              handleSaveShowcaseChannels(showcaseChannels.filter((c) => c !== ch));
                            }}
                            className="p-1 rounded-lg hover:bg-white/5 text-red-500 hover:text-red-400 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Add custom channel form */}
              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-[10px] font-bold uppercase font-mono tracking-widest" style={{ color: "var(--color-muted)" }}>
                  Agregar canal personalizado
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="@Handle o URL"
                    value={newShowcaseChannelInput}
                    onChange={(e) => setNewShowcaseChannelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const raw = newShowcaseChannelInput.trim();
                        if (raw) {
                          let finalUrl = raw.startsWith("http") ? raw : `https://www.youtube.com/@${raw.replace(/^@/, "")}`;
                          finalUrl = finalUrl.replace(/\/$/, "");
                          if (!showcaseChannels.includes(finalUrl)) {
                            handleSaveShowcaseChannels([...showcaseChannels, finalUrl]);
                          }
                          setNewShowcaseChannelInput("");
                        }
                      }
                    }}
                    className="flex-1 rounded-xl py-2 px-3 text-xs outline-none transition-all"
                    style={{
                      background: "color-mix(in srgb, var(--color-surface) 60%, var(--color-card))",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-foreground)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const raw = newShowcaseChannelInput.trim();
                      if (raw) {
                        let finalUrl = raw.startsWith("http") ? raw : `https://www.youtube.com/@${raw.replace(/^@/, "")}`;
                        finalUrl = finalUrl.replace(/\/$/, "");
                        if (!showcaseChannels.includes(finalUrl)) {
                          handleSaveShowcaseChannels([...showcaseChannels, finalUrl]);
                        }
                        setNewShowcaseChannelInput("");
                      }
                    }}
                    className="p-2 rounded-xl text-white active:scale-95 transition-all shrink-0 flex items-center justify-center"
                    style={{ background: "var(--color-primary)" }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 flex items-center justify-between border-t gap-3" style={{ borderColor: "var(--color-border)" }}>
              <button
                type="button"
                onClick={() => {
                  const defaults = [
                    "https://www.youtube.com/@EnderVerseMC",
                    "https://www.youtube.com/@KreksuMinecraft",
                    "https://www.youtube.com/@NoxusMods",
                    "https://www.youtube.com/@sir_color",
                    "https://www.youtube.com/@Wero_lovernite",
                  ];
                  handleSaveShowcaseChannels(defaults);
                }}
                className="text-[10px] font-bold uppercase transition-colors"
                style={{ color: "var(--color-muted)" }}
              >
                Restaurar sugeridos
              </button>
              <button
                type="button"
                onClick={() => setShowChannelPicker(false)}
                className="px-4 py-2 rounded-xl text-white font-bold text-xs active:scale-[0.98] transition-all"
                style={{ background: "var(--color-primary)" }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderBodyText(body: string) {
  if (!body) return <p className="text-xs text-white/40 italic">Sin descripción detallada disponible.</p>;
  
  // Clean markdown basic tags
  let clean = body
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, "")
    .replace(/\[([^\]]+)\]\(([^)]*)\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n");
    
  return (
    <p className="whitespace-pre-wrap text-xs text-white/70 leading-relaxed pr-1 font-sans">
      {clean}
    </p>
  );
}
