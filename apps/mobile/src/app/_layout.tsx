import { Stack } from "expo-router";
import { colors, Loading } from "../components/ui";
import { AuthProvider, useAuth } from "../lib/auth";

function Navigation() {
  const { session, loading } = useAuth();
  if (loading) return <Loading label="Restoring your session..." />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="month/[month]" options={{ title: "Budget" }} />
        <Stack.Screen
          name="settings/password"
          options={{ title: "Change password" }}
        />
      </Stack.Protected>
      <Stack.Screen name="auth/callback" options={{ title: "Confirm email" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
