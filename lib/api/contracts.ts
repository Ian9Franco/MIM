import { z } from "zod";

/** Absolute filesystem path (Desktop mutations). */
export const absolutePathSchema = z.string().trim().min(1);

export const sourcePathsBodySchema = z
  .object({
    sourcePaths: z.array(absolutePathSchema).min(1).optional(),
    sourcePath: absolutePathSchema.optional(),
  })
  .refine((value) => Boolean(value.sourcePaths?.length || value.sourcePath), {
    message: "Missing sourcePaths (or sourcePath)",
  });

export const filePathQuerySchema = z.object({
  path: absolutePathSchema,
});

export const projectNameBodySchema = z.object({
  project: z.string().trim().min(1, "Falta parámetro 'project'"),
});

export const moveFilesBodySchema = z.object({
  sourcePath: absolutePathSchema,
  targetPath: absolutePathSchema,
});

export const classifyBodySchema = z.object({
  sourcePaths: z.array(absolutePathSchema).optional(),
  sourcePath: absolutePathSchema.optional(),
  targetCategory: z.string().trim().min(1),
  version: z.string().trim().min(1),
  modloader: z.string().trim().min(1),
  projectName: z.string().optional(),
  projectType: z.string().optional(),
  isCopy: z.boolean().optional(),
  forceParentCategory: z.union([z.string(), z.boolean()]).optional(),
  environment: z.string().optional(),
  toGame: z.boolean().optional(),
  worldName: z.string().optional(),
});

export const crosscheckBatchBodySchema = z.object({
  mods: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        slug: z.string().optional(),
        source: z.string().trim().min(1),
      })
    )
    .min(1, "Missing or empty mods array"),
});

export const validatePathsBodySchema = z.object({
  paths: z.array(z.string()).min(1, "Paths must contain at least one path"),
});

/** POST/DELETE with no JSON body (multipart or empty). Satisfies the mutation inventory. */
export const emptyMutationQuerySchema = z.object({}).passthrough();

export const configFilesPostBodySchema = z.object({
  project: z.string().trim().min(1),
  file: z.string().trim().min(1),
  content: z.string(),
});

export const fomoDownloadHistoryBodySchema = z
  .object({
    projectId: z.union([z.string(), z.number()]).optional(),
    title: z.string().optional(),
    author: z.string().optional(),
    iconUrl: z.string().optional(),
    categories: z.array(z.string()).optional(),
    _source: z.string().optional(),
    url: z.string().optional(),
    projectType: z.string().optional(),
    fileName: z.string().optional(),
    loader: z.string().optional(),
    gameVersion: z.string().optional(),
  })
  .passthrough();

export const fomoModpackDownloadBodySchema = z.object({
  mods: z
    .array(
      z
        .object({
          id: z.string().optional(),
          name: z.string().optional(),
          fileName: z.string().optional(),
          sha1: z.string().optional(),
          platform: z.string().optional(),
          _source: z.enum(["modrinth", "curseforge"]).optional(),
          downloadUrl: z.string().optional(),
        })
        .passthrough()
    )
    .min(1, "No mods in manifest"),
  loader: z.string().trim().min(1),
  gameVersion: z.string().trim().min(1),
});

export const fomoRegistryBodySchema = z.object({
  projectId: z.union([z.string(), z.number()]).transform(String),
  versionId: z.union([z.string(), z.number()]).transform(String),
  projectName: z.string().optional(),
});

const localCollectionProjectSchema = z
  .object({
    projectId: z.string().trim().min(1),
  })
  .passthrough();

export const localCollectionsPostBodySchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      name: z.string().optional(),
      description: z.string().optional(),
    })
    .passthrough(),
  z
    .object({
      action: z.literal("add_project"),
      collectionId: z.string().trim().min(1),
      project: localCollectionProjectSchema,
    })
    .passthrough(),
  z
    .object({
      action: z.literal("remove_project"),
      collectionId: z.string().trim().min(1),
      projectId: z.string().trim().min(1),
    })
    .passthrough(),
  z
    .object({
      action: z.literal("download"),
      collectionId: z.string().trim().min(1),
      gameVersion: z.string().optional(),
      loader: z.string().optional(),
    })
    .passthrough(),
]);

export const localCollectionsDeleteBodySchema = z.object({
  collectionId: z.string().trim().min(1),
});

export const projectConfigPostBodySchema = z
  .object({
    project: z.string().trim().min(1),
    action: z.enum(["add_subcategory", "remove_subcategory", "reset_subcategories", "update_config"]),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const projectConfigMetadataBodySchema = z.object({
  project: z.string().trim().min(1),
  modId: z.string().trim().min(1),
  override: z
    .object({
      environment: z.enum(["client", "server", "both"]).optional(),
      projectType: z.enum(["mod", "library", "resourcepack", "shader"]).optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
      customName: z.string().optional(),
      isDependencyOf: z.array(z.string()).optional(),
      clientSide: z.enum(["required", "optional", "unsupported"]).optional(),
      serverSide: z.enum(["required", "optional", "unsupported"]).optional(),
      gameVersion: z.string().optional(),
      loader: z.string().optional(),
      ignoreDependencies: z.array(z.string()).optional(),
    })
    .passthrough(),
});

export const projectLogsDeleteQuerySchema = z.object({
  file: z.string().trim().min(1),
  project: z.string().optional(),
  version: z.string().optional(),
});

export const playerRescuePostBodySchema = z
  .object({
    filePath: z.string().trim().min(1),
    resetCoords: z.boolean().optional(),
    clearInventory: z.boolean().optional(),
    newCoords: z.array(z.union([z.number(), z.string()])).optional(),
    changeDimension: z.boolean().optional(),
    newDimension: z.string().optional(),
  })
  .passthrough();

export const savePlayerBodySchema = z.object({
  filePath: z.string().min(1, "filePath is required"),
  nbtData: z.custom((val) => typeof val === "object" && val !== null, "Invalid NBT data structure"),
  createBackup: z.boolean().optional().default(true),
});

export const purgeBackupsQuerySchema = z.object({
  filePath: z.string().trim().min(1),
});

export const securityScanBodySchema = z
  .object({
    filePath: z.string().trim().min(1).optional(),
    filePaths: z.array(z.string().trim().min(1)).min(1).optional(),
    localOnly: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.filePath || value.filePaths?.length), {
    message: "Provide 'filePath' or 'filePaths'",
  });

export const serverAuditBodySchema = z.object({
  desiredManifest: z
    .object({
      schemaVersion: z.literal(1),
      side: z.literal("server"),
    })
    .passthrough(),
  actualManifest: z
    .object({
      schemaVersion: z.literal(1),
      side: z.literal("server"),
    })
    .passthrough(),
  isPartialAudit: z.boolean().optional(),
});

export const validatePackBodySchema = z.object({
  version: z.string().trim().min(1),
  loader: z.enum(["forge", "neoforge", "fabric"]),
  projectName: z.string().trim().min(1),
  buildTarget: z.enum(["alluser", "allhost", "both"]),
  sinytraActive: z.boolean().optional(),
});
