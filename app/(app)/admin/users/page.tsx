import { listUsers } from "@/lib/db/queries/users";
import { InviteUserForm } from "@/components/admin/invite-user-form";
import { UsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const users = await listUsers();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Invite admins and viewers, change roles, deactivate, or reset
            passwords.
          </p>
        </div>
      </div>
      <InviteUserForm />
      <UsersTable users={users} />
    </div>
  );
}
