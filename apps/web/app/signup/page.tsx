import { Container, Stack, Typography } from "@mui/material";
import NextLink from "next/link";
import { signUp } from "../actions/auth";
import { AuthForm } from "../components/AuthForm";

const SignupPage = () => {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={3}>
        <Typography variant="h1">Create account</Typography>
        <AuthForm
          action={signUp}
          submitLabel="Create account"
          requireStrongPassword
        />
        <Typography>
          Already signed up but didn&apos;t receive the email?{" "}
          <NextLink
            href="/resend-confirmation"
            style={{ textDecoration: "underline" }}
          >
            Resend confirmation
          </NextLink>
        </Typography>
        <Typography>
          Already registered?{" "}
          <NextLink href="/login" style={{ textDecoration: "underline" }}>
            Sign in
          </NextLink>
        </Typography>
      </Stack>
    </Container>
  );
};

export default SignupPage;
