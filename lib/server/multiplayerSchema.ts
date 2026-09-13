import { z } from "zod";
import { inspectServerSchema } from "./inspectSchema";

export const syncClientServerSchema = inspectServerSchema;
export type SyncClientServerRequest = z.infer<typeof syncClientServerSchema>;
