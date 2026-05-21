import { supabase } from "@/lib/supabaseClient";

export type CommunityContentType = "favorite" | "video" | "modpack";

export function openCommunityUserProfile(username: string) {
  if (!username) return;
  window.dispatchEvent(
    new CustomEvent("fomo-open-community-user", { detail: { username } })
  );
}

export async function deleteCommunityContent(
  type: CommunityContentType,
  id: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    let error: { message: string } | null = null;
    if (type === "favorite") {
      ({ error } = await supabase.from("favorite_mods").delete().eq("id", id));
    } else if (type === "video") {
      ({ error } = await supabase.from("showcase_videos").delete().eq("id", id));
    } else if (type === "modpack") {
      ({ error } = await supabase.from("modpack_builds").delete().eq("id", id));
    }
    if (error) {
      return { ok: false, error: error.message };
    }
    window.dispatchEvent(new CustomEvent("fomo-refresh-sharing"));
    window.dispatchEvent(
      new CustomEvent("fomo-show-status", {
        detail: { text: "Contenido eliminado de MIM Cloud.", type: "success" },
      })
    );
    return { ok: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al eliminar";
    window.dispatchEvent(
      new CustomEvent("fomo-show-status", {
        detail: { text: message, type: "error" },
      })
    );
    return { ok: false, error: message };
  }
}
