import { inspectServerSchema } from "./inspectSchema";
import { z } from "zod";

const propertyKey = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9._-]+$/, "Clave de server.properties inválida");

export const inspectServerAdminSchema = inspectServerSchema;
export type InspectServerAdminRequest = z.infer<typeof inspectServerAdminSchema>;

export const updateServerPropertiesSchema = inspectServerSchema.extend({
  confirm: z.literal(true),
  updates: z.record(propertyKey, z.string().max(512)).refine(
    (value) => Object.keys(value).length > 0 && Object.keys(value).length <= 40,
    "Indicá entre 1 y 40 propiedades para actualizar."
  ),
});
export type UpdateServerPropertiesRequest = z.infer<typeof updateServerPropertiesSchema>;

export const executeServerRconSchema = inspectServerSchema.extend({
  command: z.string().trim().min(1).max(256),
  rconPassword: z.string().min(1).max(128),
  rconPort: z.number().int().min(1).max(65535).optional(),
});
export type ExecuteServerRconRequest = z.infer<typeof executeServerRconSchema>;
