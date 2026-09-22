import React from "react";
import { Users, UserPlus } from "lucide-react";
import { openCommunityUserProfile } from "@/components/fomo/community/communityActions";

export function DraftMembersTab({
  draft,
  members,
  user,
  isModern,
  setIsInviteModalOpen,
  embedded = false,
}: {
  draft: any;
  members: any[];
  user: any;
  isModern: boolean;
  setIsInviteModalOpen: (open: boolean) => void;
  embedded?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-4 h-full ${embedded ? `p-4 rounded-2xl border ${isModern ? "bg-card border-border/60" : "bg-white/[0.02] border-white/10"}` : ""}`}>
      <div className="flex items-center justify-between">
        <h3 className={`font-bold ${embedded ? "text-sm" : "text-lg"} ${isModern ? "text-foreground" : "text-white"}`}>Miembros</h3>
        {draft.owner_id === user?.id ? (
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-primary/20 transition-colors"
          >
            <Users className="w-4 h-4" /> Invitar
          </button>
        ) : (
          draft.visibility === 'public' && !members.some(m => m.user_id === user?.id) && (
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent("fomo-show-status", {
                  detail: { text: "Solicitud de colaboración enviada (Simulada).", type: "success" }
                }));
              }}
              className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-primary/20 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Solicitar Colaborar
            </button>
          )
        )}
      </div>
      
      <div className={`flex flex-col gap-2 mt-2 overflow-y-auto custom-scrollbar pr-1 ${embedded ? "flex-1 min-h-0" : "max-h-[350px]"}`}>
        {/* Owner */}
        <button
          type="button"
          onClick={() => draft.profiles?.username && openCommunityUserProfile(draft.profiles.username)}
          disabled={!draft.profiles?.username}
          className={`flex w-full items-center justify-between p-3 rounded-xl border text-left transition-colors cursor-pointer disabled:cursor-default disabled:opacity-70 ${isModern ? "bg-background border-border hover:bg-muted/50" : "bg-black/20 border-white/5 hover:bg-white/5"}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2 border-background"
              style={{ 
                backgroundColor: draft.profiles?.color || "var(--primary)",
                color: draft.profiles?.color ? "#000" : "#fff" 
              }}
            >
              {draft.profiles?.avatar_url ? (
                <img src={draft.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-lg">{(draft.profiles?.username || "O").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className={`font-bold text-sm flex items-center gap-2 ${isModern ? "text-foreground" : "text-white"}`}>
                {draft.profiles?.username || "Usuario"}
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] uppercase font-black tracking-widest">Propietario</span>
              </span>
            </div>
          </div>
        </button>

        {/* Other Members */}
        {members.filter(m => m.role !== 'owner').map(member => (
          <button
            key={member.id}
            type="button"
            onClick={() => member.profiles?.username && openCommunityUserProfile(member.profiles.username)}
            disabled={!member.profiles?.username}
            className={`flex w-full items-center justify-between p-3 rounded-xl border text-left transition-colors cursor-pointer disabled:cursor-default disabled:opacity-70 ${isModern ? "bg-background border-border hover:bg-muted/50" : "bg-black/20 border-white/5 hover:bg-white/5"}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2 border-background"
                style={{ 
                  backgroundColor: member.profiles?.color || "var(--primary)",
                  color: member.profiles?.color ? "#000" : "#fff" 
                }}
              >
                {member.profiles?.avatar_url ? (
                  <img src={member.profiles.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="font-bold text-lg">{(member.profiles?.username || "U").charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className={`font-bold text-sm ${isModern ? "text-foreground" : "text-white"}`}>{member.profiles?.username || "Usuario"}</span>
                <span className={`text-xs capitalize ${isModern ? "text-muted-foreground" : "text-white/50"}`}>{member.role}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
