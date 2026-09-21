import type { DraftMetadataUpdates } from "./draftContract";

export interface DraftRepositoryError {
  message: string;
}

export interface DraftRepositoryResult<T> {
  data: T;
  error: DraftRepositoryError | null;
}

export interface DraftRepository {
  listDrafts(userId?: string): Promise<DraftRepositoryResult<unknown[]>>;
  createDraft(input: {
    ownerId: string;
    name: string;
    minecraftVersion: string;
    loader: string;
    visibility?: "public" | "private";
    description?: string;
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
  in(column: string, values: string[]): QueryBuilder;
  or(filter: string): QueryBuilder;
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

function asRows(data: unknown): unknown[] {
  return Array.isArray(data) ? data : [];
}

function draftIdOf(row: unknown): string {
  if (!row || typeof row !== "object" || !("id" in row)) return "";
  return String((row as { id?: unknown }).id || "");
}

export function createDraftRepository(client: DraftRepositoryClient): DraftRepository {
  return {
    async listDrafts(userId) {
      const withItems =
        "*, draft_items (id, project_id, mod_name, source, category, content_type, side, version_id, dependencies), draft_members (user_id, role)";
      const scopeVisible = (columns: string) => {
        const query = client.from("drafts").select(columns);
        return userId ? query.or(`owner_id.eq.${userId},visibility.eq.public`) : query.eq("visibility", "public");
      };
      const first = await scopeVisible(withItems);
      const visible = first.error ? await scopeVisible("*") : first;
      if (visible.error) return fail([], visible.error);
      const rows = asRows(visible.data);
      if (!userId) return ok(rows);

      const memberResult = await client.from("draft_members").select("draft_id").eq("user_id", userId);
      const memberIds = asRows(memberResult.data).flatMap((row) => {
        if (!row || typeof row !== "object" || !("draft_id" in row)) return [];
        const id = String((row as { draft_id?: unknown }).draft_id || "");
        return id ? [id] : [];
      });
      const known = new Set(rows.map(draftIdOf).filter(Boolean));
      const missing = [...new Set(memberIds)].filter((id) => !known.has(id));
      if (!missing.length) return ok(rows);

      const extraSelect = first.error ? "*" : withItems;
      const extra = await client.from("drafts").select(extraSelect).in("id", missing);
      if (extra.error) return ok(rows);
      return ok([...rows, ...asRows(extra.data)]);
    },

    async createDraft({ ownerId, name, minecraftVersion, loader, visibility = "private", description }) {
      const { data, error } = await client.from("drafts").insert({
        owner_id: ownerId,
        name,
        minecraft_version: minecraftVersion,
        loader,
        visibility: visibility === "public" ? "public" : "private",
        description: description?.trim() ? description.trim().slice(0, 100) : null,
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
        user_id: profileId,
        action,
        payload,
      });
      return error ? fail(null, error) : ok(null);
    },
  };
}
