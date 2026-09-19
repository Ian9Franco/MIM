import { z } from "zod";
import { inspectServerSchema } from "./inspectSchema";

export const rollbackServerSchema = inspectServerSchema.extend({
  snapshotId: z.string().trim().min(4).max(128),
  confirm: z.literal(true),
});

export type RollbackServerRequest = z.infer<typeof rollbackServerSchema>;
