/**
 * MIM Sovereign Vault — Importer & Deterministic Account Migration Adapter
 * Injects and idempotently synchronizes vault data into Supabase for the active user session.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MimVaultSchema } from "./vaultEngine";

export interface VaultImportResult {
  success: boolean;
  draftsImported: number;
  itemsImported: number;
  favoritesImported: number;
  authorsImported: number;
  error?: string;
}

export async function importVaultToSupabase(
  vault: MimVaultSchema,
  userId: string,
  supabase: SupabaseClient
): Promise<VaultImportResult> {
  if (!userId) {
    return {
      success: false,
      draftsImported: 0,
      itemsImported: 0,
      favoritesImported: 0,
      authorsImported: 0,
      error: "No hay una sesión activa para importar la bóveda.",
    };
  }

  let draftsCount = 0;
  let itemsCount = 0;
  let favoritesCount = 0;
  let authorsCount = 0;

  try {
    const data = vault.data;

    // 1. Restaurar Borradores (Drafts) e Items asociados
    if (Array.isArray(data.drafts) && data.drafts.length > 0) {
      for (const draft of data.drafts) {
        if (!draft.name) continue;

        // Comprobar si ya existe un borrador con el mismo nombre para este usuario
        const { data: existingDraft } = await supabase
          .from("drafts")
          .select("id")
          .eq("owner_id", userId)
          .eq("name", draft.name)
          .maybeSingle();

        let targetDraftId = existingDraft?.id;

        if (!targetDraftId) {
          const { data: newDraft, error: draftErr } = await supabase
            .from("drafts")
            .insert({
              owner_id: userId,
              name: draft.name,
              description: draft.description || "",
              minecraft_version: draft.minecraft_version || "1.20.1",
              loader: draft.loader || "fabric",
              visibility: draft.visibility || "private",
              cover_image: draft.cover_image || null,
              created_at: draft.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (draftErr || !newDraft) {
            console.warn(`[VaultImporter] Error al crear borrador '${draft.name}':`, draftErr);
            continue;
          }
          targetDraftId = newDraft.id;
          draftsCount++;
        } else {
          draftsCount++;
        }

        // Insertar los items del borrador si existen
        if (Array.isArray(draft.items) && draft.items.length > 0 && targetDraftId) {
          for (const item of draft.items) {
            if (!item.project_id) continue;

            const { data: existingItem } = await supabase
              .from("draft_items")
              .select("id")
              .eq("draft_id", targetDraftId)
              .eq("project_id", item.project_id)
              .maybeSingle();

            if (!existingItem) {
              const { error: itemErr } = await supabase.from("draft_items").insert({
                draft_id: targetDraftId,
                project_id: item.project_id,
                mod_name: item.mod_name || item.project_id,
                source: item.source || "modrinth",
                category: item.category || "mods",
                content_type: item.content_type || "mods",
                side: item.side || "both",
                version_id: item.version_id || null,
                dependencies: item.dependencies || [],
              });

              if (!itemErr) itemsCount++;
            }
          }
        }
      }
    }

    // 2. Restaurar Favoritos / Recomendaciones (favorite_mods)
    if (Array.isArray(data.favorites) && data.favorites.length > 0) {
      for (const fav of data.favorites) {
        const projectId = fav.project_id || fav.mod_id;
        if (!projectId) continue;

        const { data: existingFav } = await supabase
          .from("favorite_mods")
          .select("id")
          .eq("profile_id", userId)
          .eq("mod_id", projectId)
          .maybeSingle();

        if (!existingFav) {
          const { error: favErr } = await supabase.from("favorite_mods").insert({
            profile_id: userId,
            mod_id: projectId,
            platform: fav.platform || fav.source || "modrinth",
            mod_name: fav.mod_name || projectId,
            summary: fav.summary || "",
            author: fav.author || "",
            icon_url: fav.icon_url || null,
            pinned: fav.pinned || false,
            created_at: fav.created_at || new Date().toISOString(),
          });

          if (!favErr) favoritesCount++;
        }
      }
    }

    // 3. Restaurar Autores Seguidos (followed_authors)
    if (Array.isArray(data.followedAuthors) && data.followedAuthors.length > 0) {
      for (const author of data.followedAuthors) {
        const authorName = author.author_name;
        if (!authorName) continue;

        const { data: existingAuthor } = await supabase
          .from("followed_authors")
          .select("id")
          .eq("profile_id", userId)
          .eq("author_name", authorName)
          .maybeSingle();

        if (!existingAuthor) {
          const { error: authorErr } = await supabase.from("followed_authors").insert({
            profile_id: userId,
            author_id: author.author_id || authorName,
            author_name: authorName,
            platform: author.platform || author.source || "modrinth",
            avatar_url: author.avatar_url || null,
            created_at: author.created_at || new Date().toISOString(),
          });

          if (!authorErr) authorsCount++;
        }
      }
    }

    // 4. Restaurar Mods Seguidos (followed_mods)
    if (Array.isArray(data.followedMods) && data.followedMods.length > 0) {
      for (const mod of data.followedMods) {
        if (!mod.mod_id) continue;

        const { data: existingMod } = await supabase
          .from("followed_mods")
          .select("id")
          .eq("profile_id", userId)
          .eq("mod_id", mod.mod_id)
          .maybeSingle();

        if (!existingMod) {
          await supabase.from("followed_mods").insert({
            profile_id: userId,
            mod_id: mod.mod_id,
            source: mod.source || "modrinth",
            created_at: mod.created_at || new Date().toISOString(),
          });
        }
      }
    }

    // 5. Restaurar Canales y Banner Meta si están presentes
    if (vault.identity?.banner_meta) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("banner_meta")
        .eq("id", userId)
        .maybeSingle();

      const mergedMeta = {
        ...(existingProfile?.banner_meta || {}),
        ...vault.identity.banner_meta,
      };

      await supabase.from("profiles").update({ banner_meta: mergedMeta }).eq("id", userId);
    }

    return {
      success: true,
      draftsImported: draftsCount,
      itemsImported: itemsCount,
      favoritesImported: favoritesCount,
      authorsImported: authorsCount,
    };
  } catch (error: any) {
    console.error("[VaultImporter] Error catastrófico durante la importación:", error);
    return {
      success: false,
      draftsImported: draftsCount,
      itemsImported: itemsCount,
      favoritesImported: favoritesCount,
      authorsImported: authorsCount,
      error: error?.message || "Error inesperado al importar la bóveda.",
    };
  }
}
