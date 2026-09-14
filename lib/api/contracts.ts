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
  forceParentCategory: z.boolean().optional(),
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
