"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useActionState } from "react";
import { updatePassword } from "@/app/actions/auth";
import { PASSWORD_REQUIREMENTS_PATTERN } from "@/app/lib/password";

export const UpdatePasswordForm = () => {
  const [state, formAction, isPending] = useActionState(updatePassword, {});

  return (
    <Stack component="form" action={formAction} spacing={2}>
      {state.error && <Alert severity="error">{state.error}</Alert>}
      {state.success && <Alert severity="success">{state.success}</Alert>}
      <TextField
        autoComplete="new-password"
        fullWidth
        helperText="At least 8 characters, including one uppercase letter and one symbol."
        label="New password"
        name="password"
        required
        type="password"
        slotProps={{
          htmlInput: {
            minLength: 8,
            maxLength: 128,
            pattern: PASSWORD_REQUIREMENTS_PATTERN,
          },
        }}
      />
      <TextField
        autoComplete="new-password"
        fullWidth
        label="Confirm new password"
        name="confirmPassword"
        required
        type="password"
        slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }}
      />
      <Button disabled={isPending} type="submit" variant="contained">
        {isPending ? "Updating..." : "Update password"}
      </Button>
    </Stack>
  );
};
