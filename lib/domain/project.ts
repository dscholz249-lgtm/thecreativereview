import { z } from "zod";

const ProjectStatusSchema = z.enum([
  "draft",
  "in_review",
  "completed",
  "archived",
]);

export const CreateProjectSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Deadline must be YYYY-MM-DD")
    .nullable()
    .optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial()
  .extend({
    id: z.string().uuid(),
    status: ProjectStatusSchema.optional(),
  })
  .omit({ client_id: true });

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
