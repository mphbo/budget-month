import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import {
  Button,
  Card,
  colors,
  Field,
  Heading,
  Notice,
  Page,
} from "../../components/ui";
import { getSupabase } from "../../lib/supabase";

export default function PasswordSettingsScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updatePassword = async () => {
    setError(null);
    setMessage(null);
    if (
      password.length < 8 ||
      password.length > 128 ||
      !/[A-Z]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      setError(
        "Use 8-128 characters, including an uppercase letter and a symbol.",
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setMessage("Your password has been updated.");
      setPassword("");
      setConfirmPassword("");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update your password. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Heading subtitle="Choose a new password for your account.">
        Change password
      </Heading>
      <Card>
        {error ? <Notice kind="error">{error}</Notice> : null}
        {message ? <Notice kind="success">{message}</Notice> : null}
        <Field
          autoCapitalize="none"
          autoComplete="new-password"
          label="New password"
          onChangeText={setPassword}
          secureTextEntry
          value={password}
        />
        <Field
          autoCapitalize="none"
          autoComplete="new-password"
          label="Confirm new password"
          onChangeText={setConfirmPassword}
          secureTextEntry
          value={confirmPassword}
        />
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          Use at least 8 characters, including an uppercase letter and a symbol.
        </Text>
        <Button busy={busy} onPress={() => void updatePassword()}>
          Update password
        </Button>
        <Button secondary disabled={busy} onPress={() => router.replace("/")}>
          Back to dashboard
        </Button>
      </Card>
    </Page>
  );
}
