"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/core/supabaseClient";
import {
  DraftPendingMutations,
  mergeDraftItemFromRealtime,
  type DraftItemRowLike,
} from "./draftItemsController";

type RealtimeRow = DraftItemRowLike & { draft_id?: string };

export type UseDraftRealtimeSyncOptions<TItem> = {
  draftId: string | null | undefined;
  enabled?: boolean;
  pendingRef?: RefObject<DraftPendingMutations | null>;
  getItems: () => TItem[];
  onItemsChange: (items: TItem[]) => void;
  onMapLayoutChange?: (mapLayout: unknown) => void;
  mergeRemote?: (
    items: TItem[],
    event: "INSERT" | "UPDATE" | "DELETE",
    row: RealtimeRow | null,
  ) => TItem[];
};

export function useDraftRealtimeSync<TItem>({
  draftId,
  enabled = true,
  pendingRef,
  getItems,
  onItemsChange,
  onMapLayoutChange,
  mergeRemote,
}: UseDraftRealtimeSyncOptions<TItem>): void {
  const fallbackPendingRef = useRef(new DraftPendingMutations());
  const getItemsRef = useRef(getItems);
  const onItemsRef = useRef(onItemsChange);
  const onLayoutRef = useRef(onMapLayoutChange);
  const mergeRef = useRef(mergeRemote);

  useEffect(() => {
    getItemsRef.current = getItems;
    onItemsRef.current = onItemsChange;
    onLayoutRef.current = onMapLayoutChange;
    mergeRef.current = mergeRemote;
  });

  useEffect(() => {
    if (!enabled || !draftId) return;

    const resolvePending = () => pendingRef?.current ?? fallbackPendingRef.current;

    let channel: RealtimeChannel | null = null;

    channel = supabase
      .channel(`draft-sync:${draftId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "draft_items",
          filter: `draft_id=eq.${draftId}`,
        },
        (payload) => {
          const event = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
          const row = (payload.new || payload.old) as RealtimeRow | null;
          if (!row?.id) return;

          if (event === "UPDATE" || event === "INSERT") {
            const apply = resolvePending().shouldApplyRemoteUpdate(String(row.id), {
              category: String(row.category || ""),
              side: String(row.side || "both"),
            });
            if (!apply) return;
          }

          const merge = mergeRef.current;
          const next = merge
            ? merge(getItemsRef.current(), event, row)
            : mergeDraftItemFromRealtime(
                getItemsRef.current() as Array<{ id: string }>,
                event,
                row as { id: string },
              ) as TItem[];
          onItemsRef.current(next);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drafts",
          filter: `id=eq.${draftId}`,
        },
        (payload) => {
          const nextLayout = (payload.new as { map_layout?: unknown } | null)?.map_layout;
          if (nextLayout !== undefined) onLayoutRef.current?.(nextLayout);
        },
      )
      .subscribe();

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [draftId, enabled, pendingRef]);
}
