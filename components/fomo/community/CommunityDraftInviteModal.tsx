"use client";

import React, { useState } from "react";
import { X, Search, UserPlus, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/core/supabaseClient";
import { useAuth } from "@/components/security/AuthContext";

interface CommunityDraftInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  draftId: string;
  onInvited: () => void;
}

export function CommunityDraftInviteModal({
  isOpen,
  onClose,
  currentTheme,
  draftId,
  onInvited,
}: CommunityDraftInviteModalProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isModern = currentTheme === "modern";
  const bgClass = isModern ? "bg-card text-foreground" : "bg-[#18181b] text-white";
  const inputClass = isModern
    ? "bg-background border-border text-foreground focus:border-primary"
    : "bg-white/5 border-white/10 text-white focus:border-primary";

  if (!isOpen) return null;

  React.useEffect(() => {
    if (isOpen && user) {
      loadInitialUsers();
    }
  }, [isOpen, user]);

  const loadInitialUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, color")
        .neq("id", user?.id)
        .limit(20);
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error loading initial users:", err);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !user) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Search profiles where username matches query, excluding self
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, color")
        .ilike("username", `%${query.trim()}%`)
        .neq("id", user.id)
        .limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error("Error searching users:", err);
      setError("Error al buscar usuarios.");
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async (targetUserId: string) => {
    setInviting(targetUserId);
    setError(null);
    setSuccessMsg(null);

    try {
      // Check if already a member
      const { data: existing, error: checkErr } = await supabase
        .from("draft_members")
        .select("id")
        .eq("draft_id", draftId)
        .eq("user_id", targetUserId)
        .single();

      if (existing) {
        setError("El usuario ya es miembro del draft.");
        setInviting(null);
        return;
      }

      // Add to draft_members
      const { error: insertErr } = await supabase
        .from("draft_members")
        .insert({
          draft_id: draftId,
          user_id: targetUserId,
          role: "editor"
        });

      if (insertErr) throw insertErr;

      setSuccessMsg("¡Usuario invitado con éxito!");
      onInvited();
    } catch (err: any) {
      console.error("Error inviting user:", err);
      setError("Error al invitar al usuario.");
    } finally {
      setInviting(null);
    }
  };

  return (
    <div className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in`}>
      <div className={`relative w-full max-w-md p-6 border rounded-2xl shadow-2xl flex flex-col gap-4 ${bgClass}`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 transition-colors ${isModern ? "text-muted-foreground hover:text-foreground" : "text-white/40 hover:text-white"}`}
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Invitar Miembros
          </h3>
          <p className={`text-sm mt-1 ${isModern ? "text-muted-foreground" : "text-white/60"}`}>
            Busca a un usuario por su nombre para añadirlo al draft colaborativo.
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 flex items-center gap-2">
             <X className="w-4 h-4" /> {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 text-sm text-emerald-500 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center gap-2">
             <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}

        <form onSubmit={searchUsers} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre de usuario..."
            className={`flex-1 p-3 rounded-xl border text-sm focus:ring-2 outline-none transition-all ${inputClass}`}
            autoFocus
          />
          <button 
            type="submit" 
            disabled={loading || !query.trim()}
            className="px-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </form>

        <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar mt-2 pr-1">
          {users.length === 0 && !loading && (
            <div className={`p-4 text-center rounded-xl border border-dashed ${isModern ? "border-border text-muted-foreground" : "border-white/10 text-white/40"}`}>
              No se encontraron usuarios.
            </div>
          )}
          
          {users.map((u) => (
            <div key={u.id} className={`flex items-center justify-between p-3 rounded-xl border ${isModern ? "bg-background border-border" : "bg-white/5 border-white/10"}`}>
              <div className="flex items-center gap-3">
                 <div 
                   className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2 border-background"
                   style={{ 
                     backgroundColor: u.color || "var(--primary)",
                     color: u.color ? "#000" : "#fff" 
                   }}
                 >
                   {u.avatar_url ? (
                     <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                   ) : (
                     <span className="font-bold text-lg">{(u.username || "U").charAt(0).toUpperCase()}</span>
                   )}
                 </div>
                 <span className="font-bold text-sm">{u.username}</span>
              </div>
              <button
                onClick={() => inviteUser(u.id)}
                disabled={inviting === u.id}
                className="px-3 py-1.5 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {inviting === u.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                Invitar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
