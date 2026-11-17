"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Edit, Save } from "@mui/icons-material";
import { updateProfile, type ProfileFormState } from "@/app/actions/auth";

type ProfileProps = {
  fullName: string;
  email: string;
};

const initialState: ProfileFormState = {};

export const Profile = ({ fullName, email }: ProfileProps) => {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      setEditing(false);
      router.refresh();
    }
  }, [state.success, router]);

  const nameLength = fullName.trim().length;

  const tileWidth = nameLength <= 9 ? 100 : nameLength <= 15 ? 130 : 160;

  const tileFontSize =
    nameLength <= 9 ? "1.25rem" : nameLength <= 15 ? "1.1rem" : "1rem";

  return (
    <Paper
      sx={{ width: "100%", padding: 2, mb: "20px" }}
      square={false}
      elevation={4}
    >
      <form action={formAction}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Paper
            sx={{
              width: `${tileWidth}px`,
              minWidth: "100px",
              height: "100px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              px: 1,
              boxSizing: "border-box",
              borderRadius: "8px",
              border: "0.1px solid #6d6d6d",
              mt: "4px",
              fontSize: tileFontSize,
              lineHeight: 1.2,
              overflowWrap: "anywhere",
              transition: "width 180ms ease, font-size 180ms ease",
            }}
            elevation={10}
            variant="outlined"
          >
            {fullName || "Add name"}
          </Paper>
        </Box>

        <Divider sx={{ my: "20px " }} />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                mb: "30px",
                flexWrap: "wrap",
              }}
            >
              <Typography variant="h6">Name:</Typography>

              {editing ? (
                <TextField
                  name="fullName"
                  defaultValue={fullName}
                  required
                  size="small"
                  slotProps={{ htmlInput: { maxLength: 35 } }}
                />
              ) : (
                <Typography variant="h6">
                  {fullName || "Add your name"}
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                flexWrap: "wrap",
                mb: "15px",
              }}
            >
              <Typography variant="h6">Email:</Typography>

              {editing ? (
                <TextField
                  name="email"
                  type="email"
                  defaultValue={email}
                  required
                  size="small"
                  slotProps={{ htmlInput: { maxLength: 254 } }}
                />
              ) : (
                <Typography variant="h6">{email}</Typography>
              )}
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: 1,
            }}
          >
            {editing && (
              <Button
                size="small"
                onClick={() => setEditing(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            )}

            <IconButton
              type={editing ? "submit" : "button"}
              onClick={!editing ? () => setEditing(true) : undefined}
              disabled={pending}
              sx={{
                border: "0.1px solid #6d6d6d",
                borderRadius: "5px",
                width: "40px",
                height: "40px",
              }}
            >
              {editing ? <Save fontSize="small" /> : <Edit fontSize="small" />}
            </IconButton>
          </Box>
        </Box>

        {state.error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {state.error}
          </Typography>
        )}

        {state.success && (
          <Typography color="success.main" sx={{ mt: 2 }}>
            {state.success}
          </Typography>
        )}
      </form>
    </Paper>
  );
};
