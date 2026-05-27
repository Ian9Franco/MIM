"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/core/supabaseClient";
import { Clock, PlusCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ActivityItem {
  id: string;
  mod_name: string;
  created_at: string;
  profiles: {
    username: string;
    color: string;
    avatar_url: string;
  };
}

export function DraftActivityFeed({ draftId, isModern }: { draftId: string; isModern?: boolean }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const lastFetchRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchActivity = async (isInitial: boolean = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      let query = supabase
        .from("draft_items")
        .select(`
          id, mod_name, created_at,
          profiles:added_by(username, color, avatar_url)
        `)
        .eq("draft_id", draftId)
        .order("created_at", { ascending: false })
        .limit(isInitial ? 20 : 10);
        
      if (!isInitial && lastFetchRef.current) {
        query = query.gt("created_at", lastFetchRef.current);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        if (isInitial || !lastFetchRef.current || new Date(data[0].created_at) > new Date(lastFetchRef.current)) {
           lastFetchRef.current = data[0].created_at;
        }

        setActivities((prev) => {
          if (isInitial) return data as unknown as ActivityItem[];
          
          const newItems = (data as unknown as ActivityItem[]).filter(d => !prev.some(p => p.id === d.id));
          if (newItems.length === 0) return prev;
          
          return [...newItems, ...prev].slice(0, 50);
        });
      }
    } catch (err) {
      console.error("Error fetching draft activity:", err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchActivity(true);
    
    const handleLocalUpdate = () => fetchActivity(true);
    window.addEventListener("fomo-draft-items-changed", handleLocalUpdate);
    
    // Polling más espaciado (30s) ya que las acciones locales son instantáneas por el evento
    const interval = setInterval(() => fetchActivity(false), 30000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("fomo-draft-items-changed", handleLocalUpdate);
    };
  }, [draftId]);

  return (
    <div className={`flex flex-col h-full p-4 rounded-2xl border ${isModern ? "bg-card border-border/60" : "bg-white/[0.02] border-white/10"}`}>
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Clock className={`w-4 h-4 ${isModern ? "text-primary" : "text-primary"}`} />
        <h3 className={`font-bold text-sm ${isModern ? "text-foreground" : "text-white"}`}>Actividad Reciente</h3>
      </div>

      {loading && activities.length === 0 ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-primary/20 rounded w-full"></div>
          <div className="h-4 bg-primary/20 rounded w-3/4"></div>
        </div>
      ) : activities.length === 0 ? (
        <p className={`text-xs ${isModern ? "text-muted-foreground" : "text-white/40"}`}>
          No hay actividad aún.
        </p>
      ) : (
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
          {activities.map(act => {
            const timeAgo = formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: es });
            return (
              <div key={act.id} className={`group flex items-center gap-3 p-2 rounded-xl transition-colors ${isModern ? "hover:bg-muted/50" : "hover:bg-white/5"}`}>
                <div 
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center overflow-hidden border shadow-sm"
                  style={{ borderColor: act.profiles?.color || (isModern ? 'var(--border)' : 'rgba(255,255,255,0.2)') }}
                  title={`@${act.profiles?.username}`}
                >
                  {act.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={act.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: act.profiles?.color || 'var(--primary)' }}>
                      {(act.profiles?.username || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className={`text-xs ${isModern ? "text-foreground" : "text-white/80"} truncate`}>
                    <strong className="font-bold">
                      {act.profiles?.username}
                    </strong> añadió <span className="font-bold text-primary">{act.mod_name}</span>
                  </p>
                  <p className={`text-[9px] mt-0.5 ${isModern ? "text-muted-foreground" : "text-white/40"} opacity-70 group-hover:opacity-100 transition-opacity`}>
                    {timeAgo}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
