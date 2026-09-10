import { z } from "zod";

export const dependencyActionSchema = z.object({
  type: z.enum(["install", "update", "remove", "review"]),
  modId: z.string().min(1),
  modName: z.string().optional(),
  label: z.string().min(1),
});

export const dependencyExplainModelSchema = z.object({
  summary: z.string().min(1),
  actions: z.array(dependencyActionSchema).min(1),
  severity: z.enum(["critical", "warning", "info"]).optional(),
});

export type DependencyExplainModel = z.infer<typeof dependencyExplainModelSchema>;
export type DependencyAction = z.infer<typeof dependencyActionSchema>;
