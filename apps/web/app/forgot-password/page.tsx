import { Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { Suspense } from "react";
import { requestPasswordReset } from "../actions/auth";
import { EmailActionForm } from "../components/EmailActionForm";

const ForgotPasswordPage = ({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) => {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent searchParams={searchParams} />
    </Suspense>
  );
};

const ForgotPasswordContent = async ({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) => {
  const { message } = await searchParams;

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={3}>
        <Typography variant="h1">Reset your password</Typography>
        {message === "reset-failed" && (
          <Typography color="error">
            That reset link is invalid or expired. Request a new one.
          </Typography>
        )}
        <Typography>
          Enter your email address and we&apos;ll send a password reset link.
        </Typography>
        <EmailActionForm
          action={requestPasswordReset}
          submitLabel="Send reset link"
        />
        <Typography>
          <Link href="/login" style={{ textDecoration: "underline" }}>
            Back to sign in
          </Link>
        </Typography>
      </Stack>
    </Container>
  );
};

export default ForgotPasswordPage;
