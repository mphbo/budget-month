import "server-only";
import { isPlaidConfigured } from "./config";

// Single gate for every Plaid-backed feature; add plan/subscription checks here.
export const canUseLinkedInstitutions = async (_userId: string) =>
  isPlaidConfigured();
