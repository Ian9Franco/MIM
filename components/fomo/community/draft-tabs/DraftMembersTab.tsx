import React from "react";
import { Users, UserPlus } from "lucide-react";

export function DraftMembersTab({
  draft,
  members,
  user,
  isModern,
  setIsInviteModalOpen,
}: {
  draft: any;
  members: any[];
  user: any;
  isModern: boolean;
  setIsInviteModalOpen: (open: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-bold ${isModern ? "text-foreground" : "text-white"}`}>Miembros</h3>
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
      
      <div className="flex flex-col gap-2 mt-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
        {/* Owner */}
        <div className={`flex items-center justify-between p-3 rounded-xl border ${isModern ? "bg-background border-border" : "bg-black/20 border-white/5"}`}>
          <div className="flex items-center gap-3">
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
        </div>

        {/* Other Members */}
        {members.filter(m => m.role !== 'owner').map(member => (
          <div key={member.id} className={`flex items-center justify-between p-3 rounded-xl border ${isModern ? "bg-background border-border" : "bg-black/20 border-white/5"}`}>
            <div className="flex items-center gap-3">
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
          </div>
        ))}
      </div>
    </div>
  );
}
