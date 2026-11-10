export type LinkedInstitutionStatus = "active" | "login_required" | "error";

export type LinkedInstitution = {
  id: string;
  institutionName: string;
  status: LinkedInstitutionStatus;
  lastSyncedAt: string | null;
};

export type LinkedAccountBalance = {
  id: string;
  amount: number;
};

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
