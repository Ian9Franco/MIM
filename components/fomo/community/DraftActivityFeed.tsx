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

  const fetchActivity = async (isInitial: boolean = false) => {
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
    }
  };

  useEffect(() => {
    fetchActivity(true);
    
    // Polling ligero (cada 15s) para el feed de actividad
    const interval = setInterval(() => fetchActivity(false), 15000);
    return () => clearInterval(interval);
  }, [draftId]);

  return (
    <div className={`p-4 rounded-3xl border ${isModern ? "bg-white border-black/5" : "bg-[#161618] border-white/10"}`}>
      <div className="flex items-center gap-2 mb-4">
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
        <div className="flex flex-col gap-3">
          {activities.map(act => {
            const timeAgo = formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: es });
            return (
              <div key={act.id} className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center overflow-hidden border"
                  style={{ borderColor: act.profiles?.color || 'rgba(255,255,255,0.2)' }}
                  title={`@${act.profiles?.username}`}
                >
                  {act.profiles?.avatar_url ? (
                    <img src={act.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-white" style={{ backgroundColor: act.profiles?.color || 'var(--primary)' }}>
                      {(act.profiles?.username || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className={`text-xs ${isModern ? "text-slate-700" : "text-white/80"} truncate`}>
                    <strong className={isModern ? "text-slate-900" : "text-white"}>
                      {act.profiles?.username}
                    </strong> añadió <strong className="text-primary">{act.mod_name}</strong>
                  </p>
                  <p className={`text-[9px] ${isModern ? "text-slate-400" : "text-white/40"}`}>
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
