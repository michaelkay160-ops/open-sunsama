import { z } from "zod";
import { uuidSchema } from "@open-sunsama/utils";

export const tagSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex color")
    .transform((color) => color.toUpperCase()),
});

export const updateTagSchema = tagSchema
  .partial()
  .refine(
    ({ name, color }) => name !== undefined || color !== undefined,
    "Provide a name or color"
  );

export const tagIdsSchema = z
  .array(uuidSchema)
  .min(1)
  .max(50)
  .transform(uniqueIds);

export const tagAssignmentSchema = z.object({
  taskIds: z.array(uuidSchema).min(1).max(200).transform(uniqueIds),
  tagIds: tagIdsSchema,
  operation: z.enum(["add", "remove"]),
});

function uniqueIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.toLowerCase()))].sort();
}
