"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FlaskConical, Loader2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/core/supabaseClient";
import { activeDraftManager } from "@/lib/fomo/activeDraftManager";
import { enrichDraftItemsWithIcons } from "@/lib/fomo/enrichDraftItemIcons";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";

type DraftSidebarItem = {
  id: string;
  mod_name?: string;
  project_id?: string;
  source?: string;
  content_type?: string;
  created_at?: string;
  icon_url?: string;
  iconUrl?: string;
};

export function ActiveDraftItemsSection({
  onCloseSidebar,
}: {
  onCloseSidebar?: () => void;
}) {
  const [draftMeta, setDraftMeta] = useState<{ id: string; name: string } | null>(null);
  const [items, setItems] = useState<DraftSidebarItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadItems = useCallback(async () => {
    const active = activeDraftManager.getActiveDraft();
    if (!active?.id) {
      setDraftMeta(null);
      setItems([]);
      return;
    }
    setDraftMeta({ id: active.id, name: active.name });
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("draft_items")
        .select("id, mod_name, project_id, source, content_type, created_at")
        .eq("draft_id", active.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const enriched = await enrichDraftItemsWithIcons(data || []);
      setItems(enriched as DraftSidebarItem[]);
    } catch (err) {
      console.error("[ActiveDraftItemsSection]", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
    const unsub = activeDraftManager.subscribe((state) => {
      if (!state) {
        setDraftMeta(null);
        setItems([]);
        return;
      }
      void loadItems();
    });
    const onItemsChanged = () => void loadItems();
    window.addEventListener("fomo-draft-items-changed", onItemsChanged);
    return () => {
      unsub();
      window.removeEventListener("fomo-draft-items-changed", onItemsChanged);
    };
  }, [loadItems]);

  const openDraftInCommunity = () => {
    if (!draftMeta) return;
    localStorage.setItem("fomo_community_draft_id", draftMeta.id);
    localStorage.setItem("fomo_community_subtab", "drafts");
    window.dispatchEvent(new CustomEvent("fomo-open-draft", { detail: draftMeta.id }));
    window.dispatchEvent(new CustomEvent("fomo-community-tab", { detail: "drafts" }));
    window.dispatchEvent(new CustomEvent("fomo-switch-tab", { detail: { tab: "community" } }));
    onCloseSidebar?.();
  };

  return (
    <section className="flex flex-col h-full min-h-0 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-2.5 mb-4 shrink-0">
        <SectionHeading
          icon={<FlaskConical className="w-4 h-4" />}
          title="Draft activo"
          sub={draftMeta?.name || "Sin draft seleccionado"}
          badge={items.length}
          accentColor="var(--color-primary)"
        />
        <div className="flex items-center gap-1.5 mt-1">
          {draftMeta && (
            <button
              type="button"
              onClick={openDraftInCommunity}
              className="px-3 py-1.5 rounded-xl font-label text-[10px] uppercase font-bold border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all"
            >
              Abrir
            </button>
          )}
          {onCloseSidebar && (
            <button
              type="button"
              onClick={onCloseSidebar}
              className="p-1.5 rounded-xl border border-white/10 bg-white/5 text-foreground/50 hover:text-white"
              aria-label="Cerrar panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando items…
          </div>
        ) : !draftMeta ? (
          <EmptyState message="Activá un draft en Comunidad → Drafts para ver sus items acá." />
        ) : items.length === 0 ? (
          <EmptyState message="El draft activo está vacío." />
        ) : (
          items.map((item) => {
            const icon = item.icon_url || item.iconUrl;
            const label = item.mod_name || item.project_id || "Item";
            const when = item.created_at
              ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })
              : "";
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5"
              >
                <div className="w-9 h-9 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30">
                  {icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={icon} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-primary">
                      {(label.charAt(0) || "?").toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">{label}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {(item.content_type || "mod").replace("_", " ")}
                    {item.source ? ` · ${item.source}` : ""}
                  </p>
                  {when && <p className="text-[9px] text-muted-foreground/80 mt-0.5">{when}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
