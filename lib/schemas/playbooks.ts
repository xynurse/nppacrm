import { z } from "zod";
import { PLAYBOOK_IDS } from "@/lib/playbooks";

export const runPlaybookSchema = z.object({
  eventCompanyId: z.string().uuid(),
  playbookId: z.enum(PLAYBOOK_IDS),
});

export const undoPlaybookSchema = z.object({
  eventCompanyId: z.string().uuid(),
  taskIds: z.array(z.string().uuid()).min(1).max(20),
});
