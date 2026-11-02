"use client";

import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useActionState, useState } from "react";
import type { AuthFormState } from "../actions/auth";
import { PASSWORD_REQUIREMENTS_PATTERN } from "../lib/password";

export const AuthForm = ({
  action,
  submitLabel,
  nextPath,
  requireStrongPassword = false,
}: {
  action: (
    previousState: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
  submitLabel: string;
  nextPath?: string;
  requireStrongPassword?: boolean;
}) => {
  const [state, formAction, isPending] = useActionState(action, {});
  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
  };
  const handleMouseUpPassword = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
  };

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
        type={showPassword ? "text" : "password"}
        helperText={
          requireStrongPassword
            ? "At least 8 characters, including one uppercase letter and one symbol."
            : undefined
        }
        slotProps={{
          htmlInput: {
            minLength: 8,
            maxLength: 128,
            ...(requireStrongPassword
              ? { pattern: PASSWORD_REQUIREMENTS_PATTERN }
              : {}),
          },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={
                    showPassword ? "hide the password" : "display the password"
                  }
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  onMouseUp={handleMouseUpPassword}
                  edge="end"
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <Button disabled={isPending} type="submit" variant="contained">
        {isPending ? "Please wait..." : submitLabel}
      </Button>
    </Stack>
  );
};
