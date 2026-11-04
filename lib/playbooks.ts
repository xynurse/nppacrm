/** Outreach playbooks: a named list of tasks with due offsets from today.
 * Shared by the /playbooks page and the company drawer. Client-safe. */

export type PlaybookStep = {
  title: string;
  dueOffsetDays: number;
  priority: "high" | "medium" | "low";
};

export type Playbook = {
  id: string;
  name: string;
  description: string;
  steps: PlaybookStep[];
};

export const PLAYBOOKS: Playbook[] = [
  {
    id: "first-outreach",
    name: "First outreach",
    description: "Initial email + 7-day bump + 14-day call.",
    steps: [
      { title: "Send intro sponsorship email", dueOffsetDays: 0, priority: "high" },
      { title: "Follow up if no reply", dueOffsetDays: 7, priority: "medium" },
      { title: "Call / LinkedIn nudge", dueOffsetDays: 14, priority: "medium" },
    ],
  },
  {
    id: "bounce-recovery",
    name: "Bounce recovery",
    description: "Find a valid address and re-send.",
    steps: [
      { title: "Find valid email / alternate contact", dueOffsetDays: 1, priority: "high" },
      { title: "Re-send outreach to new address", dueOffsetDays: 3, priority: "high" },
      { title: "Clear BOUNCED tag if delivered", dueOffsetDays: 5, priority: "low" },
    ],
  },
  {
    id: "proposal-close",
    name: "Proposal close",
    description: "After sending a proposal — keep momentum.",
    steps: [
      { title: "Confirm proposal received", dueOffsetDays: 2, priority: "high" },
      { title: "Answer questions / negotiate", dueOffsetDays: 7, priority: "high" },
      { title: "Ask for verbal commit", dueOffsetDays: 14, priority: "medium" },
    ],
  },
];

export const PLAYBOOK_IDS = PLAYBOOKS.map((p) => p.id) as [string, ...string[]];

export function getPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}

/** Task titles are prefixed so a run is recognisable (and de-duplicable). */
export function playbookTaskTitle(book: Playbook, step: PlaybookStep): string {
  return `[${book.name}] ${step.title}`;
}
