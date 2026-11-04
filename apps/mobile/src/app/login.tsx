import * as Linking from "expo-linking";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import {
  Button,
  Card,
  colors,
  Field,
  Heading,
  Notice,
  Page,
  TextButton,
} from "../components/ui";
import { useAuth } from "../lib/auth";
import { getSupabase } from "../lib/supabase";

export default function LoginScreen() {
  const { error: configError } = useAuth();
  const [mode, setMode] = useState<
    "signIn" | "signUp" | "forgotPassword" | "resendConfirmation"
  >("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setMessage(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (
      mode !== "forgotPassword" &&
      mode !== "resendConfirmation" &&
      (password.length < 8 || password.length > 128)
    ) {
      setError("Password must be between 8 and 128 characters.");
      return;
    }
    if (
      mode === "signUp" &&
      (!/[A-Z]/.test(password) || !/[^A-Za-z0-9]/.test(password))
    ) {
      setError("For sign-up, include an uppercase letter and a symbol.");
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabase();
      if (mode === "forgotPassword") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: Linking.createURL("auth/callback", {
              queryParams: { next: "/settings/password" },
            }),
          },
        );
        if (resetError) throw resetError;
        setMessage(
          "If an account exists for that address, a password reset link is on its way.",
        );
      } else if (mode === "resendConfirmation") {
        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email: normalizedEmail,
          options: { emailRedirectTo: Linking.createURL("auth/callback") },
        });
        if (resendError) throw resendError;
        setMessage(
          "If that address has an unconfirmed account, a new confirmation email is on its way.",
        );
      } else if (mode === "signIn") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError)
          throw new Error("Could not sign in with those credentials.");
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: Linking.createURL("auth/callback") },
        });
        if (signUpError)
          throw new Error(
            "Could not create an account. Check the email and try again.",
          );
        if (!data.session) {
          setMessage(
            "Check your email for a confirmation link. It will return you to Budget Month.",
          );
        }
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center" }}
      >
        <View style={{ gap: 22 }}>
          <Heading subtitle="A clear view of your money, month by month.">
            Budget Month
          </Heading>
          <Card>
            <Text
              style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}
            >
              {mode === "signIn"
                ? "Welcome back"
                : mode === "signUp"
                  ? "Create your account"
                  : mode === "forgotPassword"
                    ? "Reset your password"
                    : "Resend confirmation email"}
            </Text>
            {configError ? <Notice kind="error">{configError}</Notice> : null}
            {error ? <Notice kind="error">{error}</Notice> : null}
            {message ? <Notice kind="success">{message}</Notice> : null}
            <Field
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              value={email}
            />
            {mode !== "forgotPassword" && mode !== "resendConfirmation" ? (
              <Field
                autoCapitalize="none"
                autoComplete={
                  mode === "signIn" ? "current-password" : "new-password"
                }
                label="Password"
                onChangeText={setPassword}
                secureTextEntry
                value={password}
              />
            ) : null}
            {mode === "signUp" ? (
              <Text style={{ color: colors.muted, lineHeight: 20 }}>
                Use at least 8 characters, including an uppercase letter and a
                symbol.
              </Text>
            ) : null}
            <Button busy={busy} onPress={() => void submit()}>
              {mode === "signIn"
                ? "Sign in"
                : mode === "signUp"
                  ? "Create account"
                  : mode === "forgotPassword"
                    ? "Send reset link"
                    : "Resend confirmation"}
            </Button>
            {mode === "signIn" ? (
              <>
                <TextButton
                  disabled={busy}
                  onPress={() => {
                    setError(null);
                    setMessage(null);
                    setMode("forgotPassword");
                  }}
                >
                  Forgot your password?
                </TextButton>
                <TextButton
                  disabled={busy}
                  onPress={() => {
                    setError(null);
                    setMessage(null);
                    setMode("resendConfirmation");
                  }}
                >
                  Didn&apos;t receive a confirmation email?
                </TextButton>
                <TextButton
                  disabled={busy}
                  onPress={() => {
                    setError(null);
                    setMessage(null);
                    setMode("signUp");
                  }}
                >
                  New here? Create an account
                </TextButton>
              </>
            ) : (
              <TextButton
                disabled={busy}
                onPress={() => {
                  setError(null);
                  setMessage(null);
                  setMode("signIn");
                }}
              >
                Back to sign in
              </TextButton>
            )}
          </Card>
        </View>
      </KeyboardAvoidingView>
    </Page>
  );
}
