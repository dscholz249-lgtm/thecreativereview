import { z } from "zod";

export const CreateClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  primary_email: z.string().trim().email(),
  logo_url: z.string().trim().url().nullable().optional(),
});

export const UpdateClientSchema = CreateClientSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
