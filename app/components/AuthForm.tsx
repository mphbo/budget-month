"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useActionState } from "react";
import type { AuthFormState } from "../actions/auth";

export const AuthForm = ({
  action,
  submitLabel,
  nextPath,
}: {
  action: (
    previousState: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
  submitLabel: string;
  nextPath?: string;
}) => {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <Stack component="form" action={formAction} spacing={2}>
      {nextPath && <input type="hidden" name="next" value={nextPath} />}
      {state.error && <Alert severity="error">{state.error}</Alert>}
      <TextField
        autoComplete="email"
        autoFocus
        fullWidth
        label="Email"
        name="email"
        required
        type="email"
      />
      <TextField
        autoComplete={
          submitLabel === "Create account" ? "new-password" : "current-password"
        }
        fullWidth
        label="Password"
        name="password"
        required
        type="password"
        slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }}
      />
      <Button disabled={isPending} type="submit" variant="contained">
        {isPending ? "Please wait..." : submitLabel}
      </Button>
    </Stack>
  );
};
