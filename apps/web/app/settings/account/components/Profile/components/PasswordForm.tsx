"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useActionState, useState } from "react";
import { updatePassword } from "@/app/actions/auth";
import { PASSWORD_REQUIREMENTS_PATTERN } from "@/app/lib/password";
import { Box, ButtonGroup, Collapse, Fade, Typography } from "@mui/material";

const timeout = 600;

export const UpdatePasswordForm = () => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [state, formAction, isPending] = useActionState(updatePassword, {});

  const openPasswordForm = () => {
    setShowPasswordForm((prev) => !prev);
  };

  return (
    <form action={formAction}>
      <Box>
        <Collapse in={showPasswordForm} unmountOnExit timeout={timeout}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              mb: "10.5px",
              flexWrap: "wrap",
            }}
          >
            <Typography variant="h6">Password:</Typography>

            <TextField
              autoComplete="new-password"
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
              size="small"
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              mb: "20px",
              ml: "22px",
              flexWrap: "wrap",
            }}
          >
            <Typography variant="h6">Confirm:</Typography>

            <TextField
              autoComplete="new-password"
              name="confirmPassword"
              required
              type="password"
              slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }}
              size="small"
            />
          </Box>
          <ButtonGroup sx={{ mb: "20px" }}>
            <Button
              disabled={isPending}
              type="submit"
              variant="contained"
              sx={{
                ml: "140px",
              }}
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button onClick={openPasswordForm} variant="outlined">
              Cancel
            </Button>
          </ButtonGroup>
          {state.error && <Alert severity="error">{state.error}</Alert>}
          {state.success && <Alert severity="success">{state.success}</Alert>}
        </Collapse>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Fade in={!showPasswordForm} timeout={timeout}>
            <Typography>Password</Typography>
          </Fade>
          <Fade in={!showPasswordForm} timeout={timeout}>
            <Button onClick={openPasswordForm} variant="outlined">
              Change Password
            </Button>
          </Fade>
        </Box>
      </Box>
    </form>
  );
};
