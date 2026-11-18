"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { updateProfile, type ProfileFormState } from "@/app/actions/auth";

type ProfileProps = {
  fullName: string;
  email: string;
};

export const Profile = ({ fullName, email }: ProfileProps) => {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ProfileFormState>({});

  const router = useRouter();

  const nameLength = fullName.trim().length;

  const tileWidth = nameLength <= 9 ? 100 : nameLength <= 15 ? 130 : 160;

  const tileFontSize =
    nameLength <= 9 ? "1.25rem" : nameLength <= 15 ? "1.1rem" : "1rem";

  const handleEdit = () => {
    setState({});
    setEditing(true);
  };

  const handleCancel = () => {
    setState({});
    setEditing(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending) return;

    setPending(true);
    setState({});

    try {
      const formData = new FormData(event.currentTarget);
      const result = await updateProfile(formData);

      setState(result);

      if (result.success) {
        setEditing(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Profile update failed:", error);

      setState({
        error: "Could not update your profile. Please try again.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Paper
      sx={{ width: "100%", padding: 2, mb: "20px" }}
      square={false}
      elevation={4}
    >
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

      <Divider sx={{ my: "20px" }} />

      {editing ? (
        <form onSubmit={handleSubmit}>
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                mb: "10.5px",
                flexWrap: "wrap",
              }}
            >
              <Typography variant="h6">Name:</Typography>

              <TextField
                name="fullName"
                defaultValue={fullName}
                required
                size="small"
                slotProps={{ htmlInput: { maxLength: 80 } }}
              />
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

              <TextField
                name="email"
                type="email"
                defaultValue={email}
                required
                size="small"
                slotProps={{ htmlInput: { maxLength: 254 } }}
              />
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
            <Button type="submit" disabled={pending} variant="outlined">
              {pending ? "Saving..." : "Save Changes"}
            </Button>

            <Button type="button" onClick={handleCancel} disabled={pending}>
              Cancel
            </Button>
          </Box>
        </form>
      ) : (
        <>
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                mb: "20px",
                flexWrap: "wrap",
              }}
            >
              <Typography variant="h6">Name:</Typography>
              <Typography variant="h6">
                {fullName || "Add your name"}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                flexWrap: "wrap",
                mb: "20px",
              }}
            >
              <Typography variant="h6">Email:</Typography>
              <Typography variant="h6">{email}</Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Button type="button" onClick={handleEdit} variant="outlined">
              Update
            </Button>
          </Box>
        </>
      )}

      <Box sx={{ mt: "20px" }}>
        {state.error && <Alert severity="error">{state.error}</Alert>}
        {state.success && <Alert severity="success">{state.success}</Alert>}
      </Box>
    </Paper>
  );
};
