"use client";

import React, { useEffect, useState } from "react";
import { Search, UserRound } from "lucide-react";
import { supabase } from "@/lib/core/supabaseClient";
import { FomoSkeleton } from "@/components/fomo/core/FomoSkeleton";

interface MemberProfile {
  id: string;
  username?: string;
  avatar_url?: string | null;
  color?: string | null;
}

interface CommunityMembersProps {
  onOpenProfile: (username: string) => void;
}

export function CommunityMembers({ onOpenProfile }: CommunityMembersProps) {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, color")
        .not("username", "is", null)
        .order("updated_at", { ascending: false })
        .limit(60);
      if (cancelled) return;
      if (error) {
        console.warn("[CommunityMembers]", error.message);
        setMembers([]);
      } else {
        setMembers((data || []) as MemberProfile[]);
      }
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = members.filter((m) =>
    (m.username || "").toLowerCase().includes(query.toLowerCase())
  );

  if (loading) {
    return (
      <div className="px-6 pb-8">
        <FomoSkeleton variant="list" message="Cargando miembros..." count={8} />
      </div>
    );
  }

  return (
    <div className="px-6 pb-8 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar miembro..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-white/40 text-sm">No se encontraron miembros.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => member.username && onOpenProfile(member.username)}
              className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-primary/25 transition-all text-left"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm overflow-hidden shrink-0"
                style={{ backgroundColor: member.color || "var(--color-primary)" }}
              >
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (member.username || "U")[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">@{member.username}</p>
                <p className="text-[10px] text-white/40 flex items-center gap-1">
                  <UserRound className="w-3 h-3" /> Perfil público
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
