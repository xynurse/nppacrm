"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { resetPassword, updateUser } from "@/lib/actions/users";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "viewer";
  isActive: boolean;
  lastLoginAt: Date | null;
};

export function UsersTable({ users }: { users: UserRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Role</th>
            <th className="px-4 py-2">Active</th>
            <th className="px-4 py-2">Last login</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
          {users.length === 0 ? (
            <tr>
              <td
                className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                colSpan={6}
              >
                No users yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({ user }: { user: UserRow }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td className="px-4 py-2">{user.name}</td>
      <td className="px-4 py-2 font-mono text-xs">{user.email}</td>
      <td className="px-4 py-2">
        <Select
          className="h-7 w-28 text-xs"
          defaultValue={user.role}
          disabled={pending}
          onChange={(e) => {
            const role = e.target.value as "admin" | "viewer";
            startTransition(async () => {
              await updateUser({ id: user.id, role });
            });
          }}
        >
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </Select>
      </td>
      <td className="px-4 py-2">
        <input
          type="checkbox"
          className="h-4 w-4"
          defaultChecked={user.isActive}
          disabled={pending}
          onChange={(e) => {
            const isActive = e.target.checked;
            startTransition(async () => {
              await updateUser({ id: user.id, isActive });
            });
          }}
        />
      </td>
      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
        {user.lastLoginAt
          ? new Date(user.lastLoginAt).toLocaleDateString()
          : "—"}
      </td>
      <td className="px-4 py-2 text-right">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            const password = window.prompt(
              `Reset password for ${user.email}? Enter new temporary password (min 8 chars):`,
            );
            if (!password) return;
            startTransition(async () => {
              const result = await resetPassword({ id: user.id, password });
              if (!result.ok) window.alert(result.error);
              else window.alert("Password reset.");
            });
          }}
        >
          Reset password
        </Button>
      </td>
    </tr>
  );
}
