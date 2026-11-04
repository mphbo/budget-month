import { Container, Stack, Typography } from "@mui/material";
import { UpdatePasswordForm } from "../../components/UpdatePasswordForm";

const PasswordSettingsPage = () => (
  <Container maxWidth="sm" sx={{ py: 8 }}>
    <Stack spacing={3}>
      <Typography variant="h1">Change password</Typography>
      <Typography>
        Choose a new password with at least 8 characters, one uppercase letter,
        and one symbol.
      </Typography>
      <UpdatePasswordForm />
    </Stack>
  </Container>
);

export default PasswordSettingsPage;
