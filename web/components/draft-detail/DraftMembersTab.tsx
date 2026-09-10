"use client";

import React from "react";
import { motion } from "framer-motion";
import { Users, UserCheck } from "lucide-react";
import { MiembrosSkeleton } from "../FomoSkeletons";

export interface DraftMemberItem {
  id: string;
  role: string;
  profiles?: {
    username?: string | null;
    avatar_url?: string | null;
    color?: string | null;
  } | null;
}

interface DraftMembersTabProps {
  loadingMembers: boolean;
  members: DraftMemberItem[];
}

export function DraftMembersTab({
  loadingMembers,
  members,
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
      {loadingMembers ? (
        <MiembrosSkeleton />
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.06] py-8 text-center">
          <Users className="w-8 h-8 text-white/15 mx-auto mb-3" />
          <p className="text-xs text-white/40">No hay miembros adicionales en este draft.</p>
        </div>
      ) : (
        members.map((member: DraftMemberItem) => {
          const profile = member.profiles;
          const initial = (profile?.username || "?").charAt(0).toUpperCase();
          return (
            <div key={member.id} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
                style={{ backgroundColor: profile?.color || "var(--color-primary)" }}
              >
                {profile?.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-black">{initial}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">@{profile?.username || "Usuario"}</p>
                <p className="text-[9px] text-white/45 mt-0.5 capitalize font-semibold">{member.role}</p>
              </div>
              {member.role === "owner" ? (
                <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
                  Owner
                </span>
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </div>
          );
        })
      )}
    </motion.div>
  );
}
