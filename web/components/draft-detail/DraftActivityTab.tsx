"use client";

import React from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { MiembrosSkeleton } from "../FomoSkeletons";

interface DraftActivityTabProps {
  loadingActivity: boolean;
  activity: any[];
}

export function DraftActivityTab({
  loadingActivity,
  activity,
}: DraftActivityTabProps) {
  return (
    <motion.div
      key="activity"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-2"
    >
      {loadingActivity ? (
        <MiembrosSkeleton />
      ) : activity.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.06] py-8 text-center">
          <Activity className="w-8 h-8 text-white/15 mx-auto mb-3" />
          <p className="text-xs text-white/40">Sin actividad registrada aún.</p>
        </div>
      ) : (
        activity.map((evt: any) => {
          const profile = evt.profiles;
          const initial = (profile?.username || "?").charAt(0).toUpperCase();
          const date = new Date(evt.created_at).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <div key={evt.id} className="flex items-start gap-2.5 py-2.5 border-b border-white/[0.04] last:border-0">
              <div
                className="rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5 overflow-hidden"
                style={{ backgroundColor: profile?.color || "var(--color-primary)", width: 26, height: 26 }}
              >
                {profile?.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-black">{initial}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-white/80">
                  <span className="font-bold" style={{ color: profile?.color || "var(--color-primary)" }}>
                    @{profile?.username || "Usuario"}
                  </span>
                  {" "}
                  <span className="text-white/60">{evt.action}</span>
                </p>
                {evt.payload?.name && (
                  <p className="text-[9px] text-orange-300/80 mt-0.5 truncate font-semibold">
                    {evt.payload.name}
                  </p>
                )}
                <p className="text-[9px] font-mono text-white/30 mt-0.5">{date}</p>
              </div>
            </div>
          );
        })
      )}
    </motion.div>
  );
}
