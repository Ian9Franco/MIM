import type { DraftMetadataUpdates } from "./draftContract";

export interface DraftRepositoryError {
  message: string;
}

export interface DraftRepositoryResult<T> {
  data: T;
  error: DraftRepositoryError | null;
}

export interface DraftRepository {
  listDrafts(userId: string): Promise<DraftRepositoryResult<unknown[]>>;
  createDraft(input: {
    ownerId: string;
    name: string;
    minecraftVersion: string;
    loader: string;
  }): Promise<DraftRepositoryResult<unknown>>;
  updateDraftMetadata(
    draftId: string,
    updates: DraftMetadataUpdates & { updated_at?: string },
  ): Promise<DraftRepositoryResult<null>>;
  deleteDraft(draftId: string): Promise<DraftRepositoryResult<null>>;
  deleteDraftItem(input: {
    draftId: string;
    projectId?: string;
    itemId?: string;
  }): Promise<DraftRepositoryResult<null>>;
  recordDraftActivity(input: {
    draftId: string;
    profileId: string;
    action: string;
    payload: Record<string, unknown>;
  }): Promise<DraftRepositoryResult<null>>;
}

type QueryResult = { data: unknown; error: DraftRepositoryError | null };

interface QueryBuilder {
  select(columns?: string): QueryBuilder;
  insert(values: unknown): QueryBuilder;
  update(values: unknown): QueryBuilder;
  delete(): QueryBuilder;
  eq(column: string, value: string): QueryBuilder;
  maybeSingle(): Promise<QueryResult>;
  single(): Promise<QueryResult>;
  then(onfulfilled?: (value: QueryResult) => unknown): Promise<unknown>;
}

/** Minimal Supabase-shaped client; real Postgrest builders are cast at the call site. */
export type DraftRepositoryClient = {
  from(table: string): QueryBuilder;
};

function ok<T>(data: T): DraftRepositoryResult<T> {
  return { data, error: null };
}

function fail<T>(data: T, error: DraftRepositoryError): DraftRepositoryResult<T> {
  return { data, error };
}

export function createDraftRepository(client: DraftRepositoryClient): DraftRepository {
  return {
    async listDrafts(userId) {
      const { data, error } = await client
        .from("drafts")
        .select("*, draft_items (id, project_id, mod_name, source, category, content_type, side, version_id, dependencies)")
        .eq("owner_id", userId);
      if (error) return fail([], error);
      return ok(Array.isArray(data) ? data : []);
    },

    async createDraft({ ownerId, name, minecraftVersion, loader }) {
      const { data, error } = await client.from("drafts").insert({
        owner_id: ownerId,
        name,
        minecraft_version: minecraftVersion,
        loader,
        visibility: "private",
      }).select("*").single();
      if (error) return fail(null, error);
      return ok(data);
    },

    async updateDraftMetadata(draftId, updates) {
      const { error } = await client.from("drafts").update(updates).eq("id", draftId);
      return error ? fail(null, error) : ok(null);
    },

    async deleteDraft(draftId) {
      const { error } = await client.from("drafts").delete().eq("id", draftId);
      return error ? fail(null, error) : ok(null);
    },

    async deleteDraftItem({ draftId, projectId, itemId }) {
      const query = client.from("draft_items").delete();
      const { error } = itemId
        ? await query.eq("id", itemId)
        : await query.eq("draft_id", draftId).eq("project_id", projectId ?? "");
      return error ? fail(null, error) : ok(null);
    },

    async recordDraftActivity({ draftId, profileId, action, payload }) {
      const { error } = await client.from("draft_activity").insert({
        draft_id: draftId,
        profile_id: profileId,
        action,
        payload,
      });
      return error ? fail(null, error) : ok(null);
    },
  };
}
