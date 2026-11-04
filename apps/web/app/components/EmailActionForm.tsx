"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useActionState } from "react";
import type { AuthFormState } from "../actions/auth";

export const EmailActionForm = ({
  action,
  submitLabel,
}: {
  action: (
    previousState: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
  submitLabel: string;
}) => {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <Stack component="form" action={formAction} spacing={2}>
      {state.error && <Alert severity="error">{state.error}</Alert>}
      {state.success && <Alert severity="success">{state.success}</Alert>}
      <TextField
        autoComplete="email"
        autoFocus
        fullWidth
        label="Email"
        name="email"
        required
        type="email"
      />
      <Button disabled={isPending} type="submit" variant="contained">
        {isPending ? "Please wait..." : submitLabel}
      </Button>
    </Stack>
  );
};
