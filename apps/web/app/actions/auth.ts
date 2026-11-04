"use server";

import { redirect } from "next/navigation";
import { hasStrongPassword } from "../lib/password";
import { createSupabaseServerClient } from "../lib/supabase/server";

export type AuthFormState = {
  error?: string;
  success?: string;
};

const getSiteOrigin = () =>
  new URL(process.env.SITE_URL ?? "http://localhost:3000").origin;

const getCredentials = (formData: FormData) => {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    password.length < 8 ||
    password.length > 128
  ) {
    return null;
  }

  return { email: normalizedEmail, password };
};

export const signIn = async (
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> => {
  const credentials = getCredentials(formData);
  if (!credentials) {
    return {
      error: "Enter a valid email and a password of at least 8 characters.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    return { error: "Could not sign in with those credentials." };
  }

  const requestedPath = formData.get("next");
  const parsedNextPath =
    typeof requestedPath === "string" && requestedPath.startsWith("/")
      ? new URL(requestedPath, "http://localhost")
      : null;
  const nextPath =
    parsedNextPath?.origin === "http://localhost"
      ? `${parsedNextPath.pathname}${parsedNextPath.search}${parsedNextPath.hash}`
      : "/";

  redirect(nextPath);
};

export const signUp = async (
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> => {
  const password = formData.get("password");
  if (typeof password !== "string" || !hasStrongPassword(password)) {
    return {
      error:
        "Password must be 8-128 characters and include an uppercase letter and a symbol.",
    };
  }

  const credentials = getCredentials(formData);
  if (!credentials) {
    return {
      error: "Enter a valid email and a password of at least 8 characters.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: {
      emailRedirectTo: `${getSiteOrigin()}/auth/confirm`,
    },
  });

  if (error) {
    return {
      error: "Could not create an account. Check the email and try again.",
    };
  }

  if (data.session) {
    redirect("/");
  }

  redirect("/login?message=check-email");
};

export const resendConfirmation = async (
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> => {
  const email = formData.get("email");
  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${getSiteOrigin()}/auth/confirm` },
  });
  if (error) {
    return {
      error: "Could not resend the confirmation email. Please try again.",
    };
  }

  return {
    success:
      "If that address has an unconfirmed account, a new confirmation email is on its way.",
  };
};

export const requestPasswordReset = async (
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> => {
  const email = formData.get("email");
  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: `${getSiteOrigin()}/auth/confirm?next=/settings/password`,
    },
  );
  if (error) {
    return {
      error: "Could not send a password reset email. Please try again.",
    };
  }

  return {
    success:
      "If an account exists for that address, a password reset link is on its way.",
  };
};

export const updatePassword = async (
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> => {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  if (typeof password !== "string" || !hasStrongPassword(password)) {
    return {
      error:
        "Password must be 8-128 characters and include an uppercase letter and a symbol.",
    };
  }
  if (confirmPassword !== password) {
    return { error: "The passwords do not match." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    return {
      error: "Your password reset link may have expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Could not update your password. Please try again." };
  }

  return { success: "Your password has been updated." };
};

export const signOut = async () => {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error("Could not sign out. Please try again.");
  }

  redirect("/login");
};
