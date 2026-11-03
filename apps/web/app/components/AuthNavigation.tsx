import { connection } from "next/server";
import { getMonthNavigationData } from "../lib/budgets";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { AppDrawer } from "./AppDrawer";

export const AuthNavigation = async () => {
  await connection();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error && error.name !== "AuthSessionMissingError") {
    throw error;
  }
  if (!data?.claims?.sub) {
    return null;
  }

  const { months } = await getMonthNavigationData();
  return <AppDrawer months={months} />;
};
