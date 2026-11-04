import { Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { resendConfirmation } from "../actions/auth";
import { EmailActionForm } from "../components/EmailActionForm";

const ResendConfirmationPage = () => (
  <Container maxWidth="sm" sx={{ py: 8 }}>
    <Stack spacing={3}>
      <Typography variant="h1">Resend confirmation email</Typography>
      <Typography>
        Enter the email address you used to register. If it has an unconfirmed
        account, we&apos;ll send a new confirmation link.
      </Typography>
      <EmailActionForm
        action={resendConfirmation}
        submitLabel="Resend confirmation"
      />
      <Typography>
        <Link href="/login" style={{ textDecoration: "underline" }}>
          Back to sign in
        </Link>
      </Typography>
    </Stack>
  </Container>
);

export default ResendConfirmationPage;
