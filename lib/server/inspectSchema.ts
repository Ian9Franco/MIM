import { z } from "zod";

const segment = z.string().trim().min(1).max(120).refine(
  (value) => !/[<>:"/\\|?*\x00-\x1f]/.test(value) && value !== "." && value !== "..",
  "Nombre de proyecto inválido"
);
const version = z.string().trim().regex(/^\d+\.\d+(?:\.\d+)?$/, "Usá una versión como 1.20.1");
const loader = z.enum(["fabric", "forge", "neoforge"]);
export const inspectServerSchema = z.object({
  project: z.object({ name: segment, version, loader }),
  connection: z.object({
    host: z.string().trim().min(1).max(253).regex(/^[a-zA-Z0-9.:[\]-]+$/),
    port: z.number().int().min(1).max(65535),
    username: z.string().min(1).max(128),
    rootPath: z.string().trim().min(1).max(512).refine((v) => v.startsWith("/") && !v.includes("\0")),
    knownHostFingerprint: z.string().trim().regex(/^SHA256:[A-Za-z0-9+/]{43}=?$/, "Ingresá la huella SHA256 del host SSH"),
    auth: z.discriminatedUnion("type", [
      z.object({ type: z.literal("password"), password: z.string().min(1).max(1024) }),
      z.object({ type: z.literal("privateKey"), privateKey: z.string().min(1).max(32768), passphrase: z.string().max(1024).optional() }),
    ]),
  }),
  runtime: z.object({ minecraftVersion: version, loader }),
});
export type InspectServerRequest = z.infer<typeof inspectServerSchema>;
