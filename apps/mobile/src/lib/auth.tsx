import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { getSupabase } from "./supabase";

type AuthState = { session: Session | null; loading: boolean; error: string | null };
const AuthContext = createContext<AuthState>({ session: null, loading: true, error: null });

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true, error: null });
  useEffect(() => {
    try {
      const supabase = getSupabase();
      void supabase.auth.getSession().then(({ data, error }) => {
        if (error) setState({ session: null, loading: false, error: error.message });
        else setState({ session: data.session, loading: false, error: null });
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setState({ session, loading: false, error: null });
      });
      return () => subscription.unsubscribe();
    } catch (error) {
      setState({ session: null, loading: false, error: error instanceof Error ? error.message : "Could not initialize authentication." });
    }
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
