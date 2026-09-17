"use client";

import React from "react";
import { motion } from "framer-motion";
import { UserCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { MiembrosSkeleton } from "../FomoSkeletons";

export interface DraftMemberItem {
  id: string;
  role: string;
  user_id?: string;
  profiles?: {
    id?: string;
    username?: string | null;
    avatar_url?: string | null;
    color?: string | null;
  } | null;
}

interface DraftMembersTabProps {
  loadingMembers: boolean;
  members: DraftMemberItem[];
  isOwner?: boolean;
  currentUserId?: string;
  onInvite?: () => void;
  onRemoveMember?: (member: DraftMemberItem) => void;
  onOpenProfile?: (profile: { id: string; username?: string | null; avatar_url?: string | null; color?: string | null }) => void;
  error?: string | null;
}

export function DraftMembersTab({
  loadingMembers,
  members,
  isOwner,
  currentUserId,
  onInvite,
  onRemoveMember,
  onOpenProfile,
  error,
}: DraftMembersTabProps) {
  return (
    <motion.div
      key="members"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3"
    >
      {isOwner && (
        <button
          type="button"
          onClick={onInvite}
          className="mim-control-3d flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 text-[10px] font-bold text-white/75"
        >
          <UserPlus className="h-4 w-4" />
          Invitar
        </button>
      )}
      {error && <p className="text-[10px] text-rose-300">{error}</p>}
      {loadingMembers ? (
        <MiembrosSkeleton />
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.06] py-8 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-white/15" />
          <p className="text-xs text-white/40">No hay miembros adicionales en este draft.</p>
        </div>
      ) : (
        members.map((member: DraftMemberItem) => {
          const profile = member.profiles;
          const profileId = String(member.user_id || profile?.id || "").trim();
          const initial = (profile?.username || "?").charAt(0).toUpperCase();
          const canRemove = isOwner && member.role !== "owner" && member.user_id !== currentUserId;
          const openProfile = () => {
            if (!profileId || !onOpenProfile) return;
            onOpenProfile({
              id: profileId,
              username: profile?.username,
              avatar_url: profile?.avatar_url,
              color: profile?.color,
            });
          };
          return (
            <div key={member.id} className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
              <button
                type="button"
                onClick={openProfile}
                disabled={!profileId || !onOpenProfile}
                className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold"
                  style={{ backgroundColor: profile?.color || "var(--color-primary)" }}
                >
                  {profile?.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-black">{initial}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">@{profile?.username || "Usuario"}</p>
                  <p className="mt-0.5 text-[9px] font-semibold capitalize text-white/45">{member.role}</p>
                </div>
              </button>
              {member.role === "owner" ? (
                <span className="rounded-full border border-orange-500/25 bg-orange-500/15 px-2 py-0.5 text-[8px] font-bold uppercase text-orange-400">
                  Owner
                </span>
              ) : canRemove ? (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveMember?.(member);
                  }}
                  className="flex h-8 items-center gap-1 rounded-lg border border-white/10 px-2 text-[8px] font-bold uppercase text-white/50"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                  Quitar
                </button>
              ) : (
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </div>
          );
        })
      )}
    </motion.div>
  );
}
