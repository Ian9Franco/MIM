import { z } from "zod";
import { inspectServerSchema } from "./inspectSchema";

export const diagnoseServerSchema = inspectServerSchema.extend({
  logSource: z.enum(["latest-log", "crash-report"]).default("latest-log"),
  logPath: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .refine((value) => !value.includes("\0") && !value.includes(".."), "Ruta de log inválida")
    .optional(),
  deploymentId: z.string().trim().max(128).optional(),
});

export type DiagnoseServerRequest = z.infer<typeof diagnoseServerSchema>;
