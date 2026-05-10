"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  inviteUserSchema,
  resetPasswordSchema,
  updateUserSchema,
} from "@/lib/schemas/users";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function inviteUser(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = inviteUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const { email, name, role, password } = parsed.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return { ok: false, error: "A user with that email already exists" };
  }

  const passwordHash = await hash(password, 12);
  const [created] = await db
    .insert(users)
    .values({ email, name, role, passwordHash })
    .returning({ id: users.id });

  if (!created) return { ok: false, error: "Failed to create user" };

  await recordAudit({
    userId: session.user.id,
    action: "user.invite",
    entityType: "user",
    entityId: created.id,
    changes: { email, name, role },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUser(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const { id, ...rest } = parsed.data;
  const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (rest.name !== undefined) updates.name = rest.name;
  if (rest.role !== undefined) updates.role = rest.role;
  if (rest.isActive !== undefined) updates.isActive = rest.isActive;

  await db.update(users).set(updates).where(eq(users.id, id));

  await recordAudit({
    userId: session.user.id,
    action: "user.update",
    entityType: "user",
    entityId: id,
    changes: rest,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetPassword(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const passwordHash = await hash(parsed.data.password, 12);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    action: "user.reset_password",
    entityType: "user",
    entityId: parsed.data.id,
    changes: {},
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
