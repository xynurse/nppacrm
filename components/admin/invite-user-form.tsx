"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { inviteUser } from "@/lib/actions/users";

export function InviteUserForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-5 dark:border-slate-800 dark:bg-zinc-900"
      action={(formData) => {
        const payload = {
          email: String(formData.get("email") ?? ""),
          name: String(formData.get("name") ?? ""),
          role: String(formData.get("role") ?? "viewer") as
            | "admin"
            | "viewer",
          password: String(formData.get("password") ?? ""),
        };
        setError(null);
        setSuccess(null);
        startTransition(async () => {
          const result = await inviteUser(payload);
          if (!result.ok) setError(result.error);
          else {
            setSuccess(`Invited ${payload.email}`);
            (document.getElementById("invite-form") as HTMLFormElement)?.reset();
          }
        });
      }}
      id="invite-form"
    >
      <div className="space-y-1">
        <Label htmlFor="invite-name">Name</Label>
        <Input id="invite-name" name="name" required disabled={pending} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite-role">Role</Label>
        <Select id="invite-role" name="role" defaultValue="viewer">
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite-password">Temp password</Label>
        <Input
          id="invite-password"
          name="password"
          type="text"
          minLength={8}
          required
          disabled={pending}
        />
      </div>
      <div className="sm:col-span-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Inviting…" : "Invite user"}
        </Button>
        {error ? (
          <span className="ml-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </span>
        ) : null}
        {success ? (
          <span className="ml-3 text-sm text-emerald-600 dark:text-emerald-400">
            {success}
          </span>
        ) : null}
      </div>
    </form>
  );
}
