import type { JobRow, SuggestionRow } from "@/lib/db/queries/ai";
import type { BenefitRow } from "@/lib/db/queries/benefits";
import type {
  ArchivedEmailRow,
  ContactRow,
} from "@/lib/db/queries/contacts";
import type { InteractionRow } from "@/lib/db/queries/interactions";
import type { TaskRow } from "@/lib/db/queries/tasks";
import type { RichDoc } from "@/lib/tiptap/types";

export type DrawerData = {
  contacts: ContactRow[];
  emailHistory: ArchivedEmailRow[];
  interactions: InteractionRow[];
  tasks: TaskRow[];
  notesDoc: RichDoc | null;
  ai: {
    suggestions: SuggestionRow[];
    jobs: JobRow[];
    hasProspectus: boolean;
    prospectusFileName: string | null;
  };
  benefits: BenefitRow[];
};
