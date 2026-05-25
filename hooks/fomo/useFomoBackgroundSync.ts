import { useEffect, useRef } from "react";
import { mimDB } from "@/lib/storage/indexeddb";
import { incidentManager } from "@/lib/intelligence/incidentManager";
import { youtubeChannelLabel } from "@/lib/fomo/resumenService";

const SYNC_INTERVAL_MS = 1000 * 60 * 60 * 6; // 6 hours, just in case they leave the app open for a long time
const STORAGE_KEY = "mim_fomo_last_sync_state";

interface SyncState {
  lastVideoIds: Record<string, string>;
  lastModDates: Record<string, string>;
}

export function useFomoBackgroundSync() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const runSync = async () => {
      try {
        await mimDB.init();

        const stateRaw = localStorage.getItem(STORAGE_KEY);
        const state: SyncState = stateRaw
          ? JSON.parse(stateRaw)
          : { lastVideoIds: {}, lastModDates: {} };

        let stateChanged = false;

        // 1. Check followed YouTube channels
        try {
          const res = await fetch("/api/fomo/youtube-channels");
          if (res.ok) {
            const data = await res.json();
            const channels: string[] = data.channels || [];

            for (const channelUrl of channels) {
              try {
                // Limit 1 to just check the latest video
                const scRes = await fetch(
                  `/api/fomo/youtube-showcase?channel=${encodeURIComponent(
                    channelUrl
                  )}&limit=1`
                );
                if (scRes.ok) {
                  const scData = await scRes.json();
                  const latestVideo = scData.showcases?.[0];
                  
                  if (latestVideo && latestVideo.videoId) {
                    const knownId = state.lastVideoIds[channelUrl];
                    
                    // If we have a known ID and it's different from the latest one, notify
                    if (knownId && knownId !== latestVideo.videoId) {
                      const channelName = youtubeChannelLabel(channelUrl);
                      incidentManager.createIncident({
                        id: `yt-new-video-${latestVideo.videoId}`,
                        title: "Nuevo video en Showcase",
                        detail: `El canal ${channelName} ha subido: "${latestVideo.title}".`,
                        severity: "info",
                        module: "FOMO",
                        meta: { url: latestVideo.videoUrl, videoId: latestVideo.videoId, channelUrl }
                      });
                      
                      // Marcar como no leido para la UI
                      const unreadChRaw = localStorage.getItem("mim_fomo_unread_channels");
                      const unreadCh: string[] = unreadChRaw ? JSON.parse(unreadChRaw) : [];
                      if (!unreadCh.includes(channelUrl)) {
                        unreadCh.push(channelUrl);
                        localStorage.setItem("mim_fomo_unread_channels", JSON.stringify(unreadCh));
                        window.dispatchEvent(new CustomEvent("fomo-unread-channels-updated"));
                      }
                    }
                    
                    // Always update the state ID if it changed (first load or new video)
                    if (!knownId || knownId !== latestVideo.videoId) {
                      state.lastVideoIds[channelUrl] = latestVideo.videoId;
                      stateChanged = true;
                    }
                  }
                }
              } catch (err) {
                console.warn("[BackgroundSync] Error checking channel", channelUrl, err);
              }
            }
          }
        } catch (err) {
          console.warn("[BackgroundSync] Error fetching youtube channels", err);
        }

        // 2. Check followed authors
        try {
          const authorRows = await mimDB.getAllFollowedAuthors();
          const authors = authorRows.map((a: any) => typeof a === "string" ? a : a.name).filter(Boolean);

          for (const author of authors) {
            try {
              const res = await fetch(
                `/api/modrinth/discover?q=author:${encodeURIComponent(
                  author
                )}&sort=newest&pageSize=1`
              );
              if (res.ok) {
                const data = await res.json();
                const latestMod = data.mods?.[0];

                if (latestMod && latestMod.dateCreated) {
                  const knownDate = state.lastModDates[author];
                  
                  if (knownDate && new Date(latestMod.dateCreated) > new Date(knownDate)) {
                    const isRecent = (Date.now() - new Date(latestMod.dateCreated).getTime()) < 30 * 24 * 60 * 60 * 1000;
                    if (isRecent) {
                      incidentManager.createIncident({
                        id: `author-new-mod-${author}-${latestMod.projectId}`,
                      title: "Nuevo mod disponible",
                      detail: `${author} publicó "${latestMod.title}".`,
                      severity: "info",
                      module: "FOMO",
                      meta: { projectId: latestMod.projectId, author, title: latestMod.title }
                    });

                    // Marcar como no leido para la UI (solo si NO es la primera vez que se carga)
                    const unreadAuthRaw = localStorage.getItem("mim_fomo_unread_authors");
                    const unreadAuth: string[] = unreadAuthRaw ? JSON.parse(unreadAuthRaw) : [];
                    if (!unreadAuth.includes(author)) {
                      unreadAuth.push(author);
                      localStorage.setItem("mim_fomo_unread_authors", JSON.stringify(unreadAuth));
                      window.dispatchEvent(new CustomEvent("fomo-unread-authors-updated"));
                    }
                  }
                  }
                  
                  // Always update the state date to the latest
                  if (knownDate !== latestMod.dateCreated) {
                    state.lastModDates[author] = latestMod.dateCreated;
                    stateChanged = true;
                  }
                }
              }
            } catch (err) {
              console.warn("[BackgroundSync] Error checking author", author, err);
            }
          }
        } catch (err) {
          console.warn("[BackgroundSync] Error fetching authors", err);
        }

        if (stateChanged) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
      } catch (err) {
        console.error("[BackgroundSync] Global sync error", err);
      }
    };

    // Run once after 5 seconds to not block app startup
    setTimeout(runSync, 5000);
    
    // Then every SYNC_INTERVAL_MS
    const interval = setInterval(runSync, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
