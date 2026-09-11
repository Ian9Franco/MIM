import { inspectServerSchema } from "./inspectSchema";
import { z } from "zod";

/** Same connection/project identity as inspect, plus an explicit mutate confirmation. */
export const deployServerSchema = inspectServerSchema.extend({
  confirm: z.literal(true),
});

export type DeployServerRequest = z.infer<typeof deployServerSchema>;
