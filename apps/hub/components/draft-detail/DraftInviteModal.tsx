"use client";

import React, { useEffect, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

interface ProfileHit {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  color?: string | null;
}

interface DraftInviteModalProps {
  isOpen: boolean;
  draftId: string;
  currentUserId?: string;
  onClose: () => void;
  onInvited: () => void;
}

export function DraftInviteModal({
  isOpen,
  draftId,
  currentUserId,
  onClose,
  onInvited,
}: DraftInviteModalProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ProfileHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadUsers = async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      let request = supabase
        .from("profiles")
        .select("id, username, avatar_url, color")
        .limit(20);
      if (currentUserId) request = request.neq("id", currentUserId);
      if (search.trim()) request = request.ilike("username", `%${search.trim()}%`);
      const { data, error: loadError } = await request;
      if (loadError) throw loadError;
      setUsers((data || []) as ProfileHit[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo buscar usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setError(null);
    setSuccessMsg(null);
    void loadUsers("");
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;

  async function inviteUser(targetUserId: string) {
    setInviting(targetUserId);
    setError(null);
    setSuccessMsg(null);
    try {
      const { data: existing, error: checkError } = await supabase
        .from("draft_members")
        .select("id")
        .eq("draft_id", draftId)
        .eq("user_id", targetUserId)
        .maybeSingle();
      if (checkError) throw checkError;
      if (existing) {
        setError("El usuario ya es miembro del draft.");
        return;
      }

      const { error: insertError } = await supabase.from("draft_members").insert({
        draft_id: draftId,
        user_id: targetUserId,
        role: "editor",
      });
      if (insertError) throw insertError;
      setSuccessMsg("Usuario invitado.");
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo invitar al usuario.");
    } finally {
      setInviting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[8px] font-mono font-bold uppercase text-white/35">Colaboradores</p>
            <h3 className="text-sm font-black text-white">Invitar miembro</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void loadUsers(query);
          }}
          className="mb-3 flex gap-2"
        >
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3">
            <Search className="h-4 w-4 text-white/35" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder="Buscar por username"
              className="min-w-0 flex-1 bg-transparent text-[11px] text-white outline-none placeholder:text-white/30"
            />
          </label>
          <button type="submit" className="mim-control-3d h-10 rounded-xl border border-white/10 px-3 text-[10px] font-bold text-white/70">
            Buscar
          </button>
        </form>
        {error && <p className="mb-2 text-[10px] text-rose-300">{error}</p>}
        {successMsg && <p className="mb-2 text-[10px] text-emerald-300">{successMsg}</p>}
        <div className="max-h-72 space-y-2 overflow-y-auto scrollbar-none">
          {loading ? (
            <p className="py-8 text-center text-[10px] text-white/40">Buscando…</p>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-[10px] text-white/40">No hay resultados.</p>
          ) : (
            users.map((user) => (
              <div key={user.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold"
                  style={{ backgroundColor: user.color || "var(--color-primary)" }}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-black">{(user.username || "?").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <p className="min-w-0 flex-1 truncate text-xs font-bold text-white">@{user.username || "usuario"}</p>
                <button
                  type="button"
                  disabled={inviting === user.id}
                  onClick={() => {
                    void inviteUser(user.id);
                  }}
                  className="mim-control-3d flex h-8 items-center gap-1 rounded-lg border border-white/10 px-2 text-[9px] font-bold text-white/70 disabled:opacity-50"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invitar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
