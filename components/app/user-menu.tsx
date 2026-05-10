import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";

export function UserMenu({
  user,
}: {
  user: { name: string; email: string; role: "admin" | "viewer" };
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <div className="text-sm font-medium leading-tight">{user.name}</div>
        <div className="text-xs leading-tight text-slate-500 dark:text-slate-400">
          {user.role === "admin" ? "Admin" : "Viewer"} · {user.email}
        </div>
      </div>
      <form action={logoutAction}>
        <Button variant="ghost" size="icon" type="submit" title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
