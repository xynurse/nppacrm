import { z } from "zod";

export const inviteUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(120),
  role: z.enum(["admin", "viewer"]).default("viewer"),
  password: z.string().min(8).max(72),
});

export const updateUserSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(120).optional(),
  role: z.enum(["admin", "viewer"]).optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  id: z.uuid(),
  password: z.string().min(8).max(72),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
