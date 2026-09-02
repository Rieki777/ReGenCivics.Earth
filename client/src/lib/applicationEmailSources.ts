export const APPLICATION_EMAIL_SOURCES = [
  {
    id: "approved_projects",
    status: "approved",
    label: "Approved Projects",
  },
  {
    id: "applications_submitted",
    status: "submitted",
    label: "Submitted Applications",
  },
  {
    id: "applications_under_review",
    status: "under_review",
    label: "Under Review",
  },
  {
    id: "applications_changes_requested",
    status: "changes_requested",
    label: "Changes Requested",
  },
  {
    id: "applications_rejected",
    status: "rejected",
    label: "Rejected Applications",
  },
] as const;

export type ApplicationEmailSourceId = (typeof APPLICATION_EMAIL_SOURCES)[number]["id"];
export type ApplicationEmailStatus = (typeof APPLICATION_EMAIL_SOURCES)[number]["status"];

export function sourceIdForStatus(status: string): ApplicationEmailSourceId | undefined {
  return APPLICATION_EMAIL_SOURCES.find((s) => s.status === status)?.id;
}

export function sourceLabelForId(id: string): string {
  return APPLICATION_EMAIL_SOURCES.find((s) => s.id === id)?.label ?? id;
}

export function statusForSourceId(id: string): ApplicationEmailStatus | undefined {
  return APPLICATION_EMAIL_SOURCES.find((s) => s.id === id)?.status;
}
