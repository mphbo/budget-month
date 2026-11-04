import { Alert, Container, Stack, Typography } from "@mui/material";
import NextLink from "next/link";
import { Suspense } from "react";
import { signIn } from "../actions/auth";
import { AuthForm } from "../components/AuthForm";

const LoginPage = ({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) => {
  return (
    <Suspense fallback={null}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
};

const LoginContent = async ({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) => {
  const { next, message } = await searchParams;

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={3}>
        <Typography variant="h1">Sign in</Typography>
        {message === "check-email" && (
          <Alert severity="success">
            Check your email to confirm your account, then sign in.
          </Alert>
        )}
        {message === "confirmation-failed" && (
          <Alert severity="error">
            That confirmation link is invalid or expired. Request a new
            confirmation email and try again.
          </Alert>
        )}
        {message === "password-updated" && (
          <Alert severity="success">Your password has been updated.</Alert>
        )}
        <AuthForm action={signIn} submitLabel="Sign in" nextPath={next} />
        <Typography>
          <NextLink
            href="/forgot-password"
            style={{ textDecoration: "underline" }}
          >
            Forgot your password?
          </NextLink>
        </Typography>
        <Typography>
          <NextLink
            href="/resend-confirmation"
            style={{ textDecoration: "underline" }}
          >
            Didn&apos;t receive a confirmation email?
          </NextLink>
        </Typography>
        <Typography>
          New here?{" "}
          <NextLink href="/signup" style={{ textDecoration: "underline" }}>
            Create an account
          </NextLink>
        </Typography>
      </Stack>
    </Container>
  );
};

export default LoginPage;
