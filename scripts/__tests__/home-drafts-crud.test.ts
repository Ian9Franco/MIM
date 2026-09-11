/**
 * Test Suite: REC-03 Draft CRUD repository (create/edit/delete/refresh)
 */

import assert from "node:assert/strict";
import { createDraftRepository, type DraftRepositoryClient } from "../../apps/hub/lib/drafts/draftRepository";

type Row = Record<string, unknown>;

class MemoryDraftClient {
  drafts: Row[] = [];
  draftItems: Row[] = [];
  draftActivity: Row[] = [];
  failNextInsert = false;

  from(table: string) {
    const self = this;
    const filters: Array<{ column: string; value: string }> = [];
    let operation: "select" | "insert" | "update" | "delete" = "select";
    let payload: unknown;

    const builder = {
      select(_columns: string) {
        operation = "select";
        return builder;
      },
      insert(values: unknown) {
        operation = "insert";
        payload = values;
        return builder;
      },
      update(values: unknown) {
        operation = "update";
        payload = values;
        return builder;
      },
      delete() {
        operation = "delete";
        return builder;
      },
      eq(column: string, value: string) {
        filters.push({ column, value });
        return builder;
      },
      async maybeSingle() {
        const rows = await builder.then();
        return { data: Array.isArray(rows.data) ? rows.data[0] ?? null : rows.data, error: rows.error };
      },
      async single() {
        const rows = await builder.then();
        const data = Array.isArray(rows.data) ? rows.data[0] ?? null : rows.data;
        return { data, error: rows.error };
      },
      async then() {
        if (table === "drafts") return self.handleDrafts(operation, payload, filters);
        if (table === "draft_items") return self.handleDraftItems(operation, payload, filters);
        if (table === "draft_activity") return self.handleDraftActivity(operation, payload);
        return { data: null, error: { message: `Unknown table ${table}` } };
      },
    };

    return builder;
  }

  private handleDrafts(operation: string, payload: unknown, filters: Array<{ column: string; value: string }>) {
    if (operation === "insert") {
      if (this.failNextInsert) {
        this.failNextInsert = false;
        return { data: null, error: { message: "insert failed" } };
      }
      const row = { id: `draft-${this.drafts.length + 1}`, ...(payload as Row) };
      this.drafts.push(row);
      return { data: [row], error: null };
    }
    if (operation === "select") {
      const ownerFilter = filters.find((filter) => filter.column === "owner_id");
      const rows = ownerFilter
        ? this.drafts.filter((row) => row.owner_id === ownerFilter.value).map((row) => ({
            ...row,
            draft_items: this.draftItems.filter((item) => item.draft_id === row.id),
          }))
        : this.drafts;
      return { data: rows, error: null };
    }
    if (operation === "update") {
      const idFilter = filters.find((filter) => filter.column === "id");
      const row = this.drafts.find((candidate) => candidate.id === idFilter?.value);
      if (!row) return { data: null, error: { message: "draft not found" } };
      Object.assign(row, payload as Row);
      return { data: null, error: null };
    }
    if (operation === "delete") {
      const idFilter = filters.find((filter) => filter.column === "id");
      this.drafts = this.drafts.filter((row) => row.id !== idFilter?.value);
      return { data: null, error: null };
    }
    return { data: null, error: { message: "unsupported drafts operation" } };
  }

  private handleDraftItems(operation: string, payload: unknown, filters: Array<{ column: string; value: string }>) {
    if (operation === "delete") {
      const draftFilter = filters.find((filter) => filter.column === "draft_id");
      const projectFilter = filters.find((filter) => filter.column === "project_id");
      const idFilter = filters.find((filter) => filter.column === "id");
      this.draftItems = this.draftItems.filter((item) => {
        if (idFilter) return item.id !== idFilter.value;
        if (draftFilter && projectFilter) {
          return !(item.draft_id === draftFilter.value && item.project_id === projectFilter.value);
        }
        return true;
      });
      return { data: null, error: null };
    }
    if (operation === "insert") {
      const rows = Array.isArray(payload) ? payload : [payload];
      for (const row of rows as Row[]) {
        this.draftItems.push({ id: `item-${this.draftItems.length + 1}`, ...row });
      }
      return { data: null, error: null };
    }
    return { data: null, error: { message: "unsupported draft_items operation" } };
  }

  private handleDraftActivity(operation: string, payload: unknown) {
    if (operation === "insert") {
      this.draftActivity.push(payload as Row);
      return { data: null, error: null };
    }
    return { data: null, error: { message: "unsupported draft_activity operation" } };
  }
}

async function testCreateRefreshEditDeleteFlow(): Promise<void> {
  const client = new MemoryDraftClient();
  const repo = createDraftRepository(client as unknown as DraftRepositoryClient);
  const userId = "user-1";

  const empty = await repo.listDrafts(userId);
  assert.equal(empty.error, null);
  assert.equal(empty.data.length, 0);

  const created = await repo.createDraft({
    ownerId: userId,
    name: "Survival Pack",
    minecraftVersion: "1.21.1",
    loader: "fabric",
  });
  assert.equal(created.error, null);
  assert.ok(created.data);

  const refreshed = await repo.listDrafts(userId);
  assert.equal(refreshed.data.length, 1);
  assert.equal((refreshed.data[0] as Row).name, "Survival Pack");

  const updated = await repo.updateDraftMetadata(String((refreshed.data[0] as Row).id), {
    name: "Survival Pack v2",
    visibility: "public",
    updated_at: "2026-09-11T00:00:00.000Z",
  });
  assert.equal(updated.error, null);

  await repo.recordDraftActivity({
    draftId: String((refreshed.data[0] as Row).id),
    profileId: userId,
    action: "actualizó la configuración (nombre,visibilidad)",
    payload: { name: "Survival Pack v2" },
  });
  assert.equal(client.draftActivity.length, 1);

  client.draftItems.push({
    id: "item-1",
    draft_id: String((refreshed.data[0] as Row).id),
    project_id: "sodium",
  });

  const removed = await repo.deleteDraftItem({
    draftId: String((refreshed.data[0] as Row).id),
    projectId: "sodium",
  });
  assert.equal(removed.error, null);
  assert.equal(client.draftItems.length, 0);

  const deleted = await repo.deleteDraft(String((refreshed.data[0] as Row).id));
  assert.equal(deleted.error, null);
  const afterDelete = await repo.listDrafts(userId);
  assert.equal(afterDelete.data.length, 0);

  console.log("✔ draft repository create → refresh → edit → delete item → delete draft flow passed");
}

async function testCreateFailureSurfacesError(): Promise<void> {
  const client = new MemoryDraftClient();
  client.failNextInsert = true;
  const repo = createDraftRepository(client as unknown as DraftRepositoryClient);
  const result = await repo.createDraft({
    ownerId: "user-1",
    name: "Broken",
    minecraftVersion: "1.21.1",
    loader: "fabric",
  });
  assert.ok(result.error);
  assert.equal(result.data, null);
  console.log("✔ draft repository surfaces insert failures");
}

async function run(): Promise<void> {
  await testCreateRefreshEditDeleteFlow();
  await testCreateFailureSurfacesError();
  console.log("\nAll REC-03 draft CRUD repository tests passed successfully!");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
