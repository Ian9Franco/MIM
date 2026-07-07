"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, Calendar, Compass, Share2, Award, Film, Loader2, User, Key, Mail, LogOut, Check, ChevronRight, Bookmark, ExternalLink, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "../components/BottomNav";
import { VerticalTicker, ModHit } from "../components/SpotlightMarquees";
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
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("profile"); // Default to Profile/Login first
  const [selectedMod, setSelectedMod] = useState<ModHit | null>(null);

  // Auth State
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // User Profile Data Cloud State
  const [userFavorites, setUserFavorites] = useState<any[]>([]);
  const [userDrafts, setUserDrafts] = useState<any[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);

  // Spotlight Live Data State
  const [updatedMods, setUpdatedMods] = useState<ModHit[]>(mockUpdatedMods);
  const [newestMods, setNewestMods] = useState<ModHit[]>(mockNewestMods);
  const [loadingSpotlight, setLoadingSpotlight] = useState(false);

  // Featured Collections State (Desktop Spotlight Style)
  const [modrinthFeatured, setModrinthFeatured] = useState<CollectionItem[]>([]);
  const [curseForgeFeatured, setCurseForgeFeatured] = useState<CollectionItem[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);

  // YouTube Live Data State
  const [youtubePosts, setYoutubePosts] = useState<any[]>([]);
  const [loadingYoutube, setLoadingYoutube] = useState(false);
  const [currentChannel, setCurrentChannel] = useState("https://www.youtube.com/@EnderVerseMC");

  // Rankings Live Data State
  const [rankings, setRankings] = useState<ModHit[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(false);

  const handleOpenModDetails = (mod: ModHit) => {
    setSelectedMod(mod);
  };

  const handleCloseModDetails = () => {
    setSelectedMod(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTHENTICATION LOGIC (Supabase)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Read initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile and user specific data when logged in
  const loadUserData = useCallback(async (userId: string) => {
    try {
      setLoadingUserData(true);
      
      // 1. Fetch Profile
      const { data: profData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (profData) setProfile(profData);

      // 2. Fetch User Favorite Mods
      const { data: favs } = await supabase
        .from("favorite_mods")
        .select("*")
        .eq("profile_id", userId);
      
      if (favs) setUserFavorites(favs);

      // 3. Fetch User Collaborative Drafts
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
    }
  }, [session, loadUserData]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    try {
      setAuthLoading(true);
      if (isRegistering) {
        // Sign up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username || email.split("@")[0] }
          }
        });
        if (error) throw error;
        alert("¡Registro exitoso! Iniciando sesión...");
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      alert(err.message || "Error en la autenticación");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA FETCHING LOGIC
  // ─────────────────────────────────────────────────────────────────────────────

  // Fetch Modrinth & CurseForge Featured Editorial rows (desktop style)
  const loadCollections = useCallback(async () => {
    try {
      setLoadingCollections(true);
      // Fetch Modrinth collections proxy
      const mrPromise = fetch("/api/modrinth/official").then(r => r.json());
      // Fetch CurseForge picks proxy
      const cfPromise = fetch("/api/curseforge/picks").then(r => r.json());

      const [mrRes, cfRes] = await Promise.all([mrPromise, cfPromise]);
      if (mrRes.collections) setModrinthFeatured(mrRes.collections.slice(0, 5));
      if (cfRes.picks) setCurseForgeFeatured(cfRes.picks);
    } catch (e) {
      console.error("Error loading editorial collections:", e);
    } finally {
      setLoadingCollections(false);
    }
  }, []);

  // Fetch Tickers from Modrinth Live API
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

  // Sync state between tabs
  useEffect(() => {
    if (activeTab === "spotlight") {
      loadSpotlightData();
      loadCollections();
    } else if (activeTab === "rankings") {
      loadRankingsData();
    } else if (activeTab === "feed") {
      loadYoutubeData(currentChannel);
    }
  }, [activeTab, currentChannel, loadSpotlightData, loadCollections, loadRankingsData, loadYoutubeData]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden px-4 pt-6">
      
      {/* Header Bar */}
      <header className="flex justify-between items-center mb-6 px-1">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-orange-500 font-bold">MIM Hub</span>
          <h1 className="text-lg font-bold text-white tracking-tight mt-0.5">FOMO Cloud</h1>
        </div>
        <button 
          onClick={() => alert("MIM FOMO Web v1.2.0")}
          className="bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-full p-2 text-white/70 active:scale-95 transition-all"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        
        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 1: PROFILE / LOGIN
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-24 scrollbar-none animate-fade-in">
            {!session ? (
              // Login / Register Form (Glassmorphism)
              <div className="my-auto bg-[#151518]/80 border border-white/[0.06] rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
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
              // Connected Profile (Real Cloud Data Dashboard)
              <div className="flex flex-col gap-6">
                {/* Profile banner block */}
                <div className="bg-[#151518]/90 border border-white/[0.06] rounded-3xl p-5 flex items-center gap-4 relative overflow-hidden">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/[0.08] flex items-center justify-center text-rose-400 text-lg font-black uppercase">
                    {profile?.username?.substring(0, 2) || session.user.email.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[8px] font-bold font-mono px-2 py-0.5 rounded-full uppercase">FOMO Member</span>
                    <h2 className="text-sm font-bold text-white truncate mt-1.5">@{profile?.username || "Usuario"}</h2>
                    <p className="text-[10px] text-white/40 truncate mt-0.5">{session.user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/[0.08] rounded-full p-2 text-white/50 active:scale-95 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Borradores/Drafts colaborativos */}
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
                        <div key={draft.id} className="bg-[#151518]/80 border border-white/[0.05] rounded-2xl p-4 flex justify-between items-center">
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

                {/* Mis Favoritos */}
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
                        <div key={fav.id} className="bg-[#151518]/80 border border-white/[0.05] rounded-2xl p-3.5 flex items-center gap-3">
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
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 2: SPOTLIGHT (Desktop Style With Collections)
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === "spotlight" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-24 scrollbar-none animate-fade-in">
            {/* Spotlight mini headline */}
            <div className="bg-gradient-to-r from-orange-500/10 to-transparent border-l-2 border-orange-500 rounded-r-lg p-3 mb-6 shrink-0">
              <p className="text-[10px] font-mono text-orange-400 uppercase tracking-wider font-bold">Trending Live</p>
              <h2 className="text-xs font-semibold text-white/95 mt-1">Minecraft Mods e ideas editoriales en vivo.</h2>
            </div>

            {/* CurseForge Picks (Editorial collections slider) */}
            {curseForgeFeatured.length > 0 && (
              <div className="flex flex-col gap-3 mb-6 shrink-0">
                <h3 className="text-xs font-bold text-white/80 tracking-wide px-1 flex items-center gap-1.5">
                  CurseForge Picks
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                  {curseForgeFeatured.map(pick => (
                    <div 
                      key={pick.id}
                      onClick={() => alert(`Colección CurseForge: ${pick.name}`)}
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

            {/* Modrinth Featured Collections Slider */}
            {modrinthFeatured.length > 0 && (
              <div className="flex flex-col gap-3 mb-6 shrink-0">
                <h3 className="text-xs font-bold text-white/80 tracking-wide px-1 flex items-center gap-1.5">
                  Colecciones de Modrinth
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                  {modrinthFeatured.map(coll => (
                    <div 
                      key={coll.id}
                      onClick={() => alert(`Colección Modrinth: ${coll.name}`)}
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

            {/* Vertical Tickers side-by-side (300px bound) */}
            <div className="flex gap-4 h-[300px] min-h-[300px] mb-4">
              {/* Column 1: Recently Updated */}
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

              {/* Column 2: Newest Created */}
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
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 3: CANALES DE YOUTUBE FEED
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === "feed" && (
          <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
            {/* Channel Selector */}
            <div className="flex gap-2 mb-4 shrink-0 overflow-x-auto pb-1 scrollbar-none">
              {[
                { name: "Wero Lovernite", url: "https://www.youtube.com/@Wero_lovernite" },
                { name: "EnderVerseMC", url: "https://www.youtube.com/@EnderVerseMC" }
              ].map(chan => (
                <button
                  key={chan.url}
                  onClick={() => setCurrentChannel(chan.url)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    currentChannel === chan.url 
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                      : "bg-white/5 text-white/50 border border-white/[0.05]"
                  }`}
                >
                  {chan.name}
                </button>
              ))}
            </div>

            {/* Posts feed */}
            {loadingYoutube ? (
              <div className="flex-1 flex flex-col justify-center items-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <span className="text-xs text-white/40 mt-3 font-mono">Conectando con YouTube...</span>
              </div>
            ) : youtubePosts.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-4 pb-28 pr-1 scrollbar-none">
                {youtubePosts.map((post) => (
                  <div key={post.postId} className="bg-[#151518]/90 border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
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
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 4: COMMUNITY RANKINGS (Supabase)
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === "rankings" && (
          <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
            {/* Top votes title */}
            <div className="bg-gradient-to-r from-purple-500/10 to-transparent border-l-2 border-purple-500 rounded-r-lg p-3 mb-6 shrink-0">
              <p className="text-[10px] font-mono text-purple-400 uppercase tracking-wider font-bold">Supabase Rankings</p>
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
                    className="bg-[#151518]/90 border border-white/[0.05] rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer"
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
          </div>
        )}
      </main>

      {/* Bottom Nav Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Mod Details Sheet / Modal (AnimatePresence + Motion.div with bounce) */}
      <AnimatePresence>
        {selectedMod && (
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end justify-center z-50" 
            onClick={handleCloseModDetails}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }} // Spring transition bounce physics
              className="bg-[#151518] border-t border-white/[0.08] rounded-t-3xl w-full max-w-md p-6 pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] flex flex-col gap-5 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag indicator line */}
              <div className="w-12 h-1 rounded-full bg-white/10 mx-auto -mt-2 mb-2" />

              {/* Header block details */}
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

              {/* Extra Metadata row details (similar to desktop) */}
              <div className="flex gap-3 text-[10px] border-y border-white/[0.04] py-3 flex-wrap">
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
                {selectedMod.downloads && (
                  <div className="min-w-[50px]">
                    <span className="text-white/30 block uppercase font-mono tracking-wider">Votos</span>
                    <span className="text-orange-400 font-bold mt-0.5 block font-mono">{selectedMod.downloads}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                <p className="text-xs text-white/75 leading-relaxed max-h-40 overflow-y-auto scrollbar-none">
                  {selectedMod.description || "Este mod expande las opciones de automatización, optimiza de forma ligera el juego y es totalmente compatible con la versión activa."}
                </p>
              </div>

              {/* Action buttons (only desktop invitation) */}
              <div className="flex flex-col gap-2 mt-1">
                <button
                  onClick={() => alert(`Copiá el link para tu PC: mim://project/${selectedMod.projectId}`)}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4" /> Abrir en MIM Desktop
                </button>
                <p className="text-[9px] text-center text-white/30">
                  Para instalar automáticamente con 1-click, necesitás tener abierta la app en tu PC.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
