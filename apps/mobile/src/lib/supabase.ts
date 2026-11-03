import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const secureStorage: SupportedStorage = {
  getItem: (key) =>
    Platform.OS === "web" ? Promise.resolve(localStorage.getItem(key)) : SecureStore.getItemAsync(key),
  setItem: (key, value) =>
    Platform.OS === "web" ? Promise.resolve(localStorage.setItem(key, value)) : SecureStore.setItemAsync(key, value),
  removeItem: (key) =>
    Platform.OS === "web" ? Promise.resolve(localStorage.removeItem(key)) : SecureStore.deleteItemAsync(key),
};

let client: ReturnType<typeof createClient> | null = null;

export const getSupabase = () => {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in apps/mobile/.env.local, then restart Expo.");
  }
  client = createClient(url, publishableKey, {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
};
